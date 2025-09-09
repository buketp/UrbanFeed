// public/admin.js

// API_KEY localStorage'da tutuluyorsa al (POST'larda kullanıyoruz)
const API_KEY = localStorage.getItem("API_KEY") || "";

// Mesaj kutuları (admin.html'de var)
const okEl  = document.getElementById("ok");
const errEl = document.getElementById("err");
function show(el, text){
  if (!el) return;
  el.textContent = text;
  el.style.display = "block";
  setTimeout(()=>{ el.style.display = "none"; }, 3000);
}
function okMsg(t){ show(okEl, t); }
function errMsg(t){ show(errEl, t); }

// Şehir listesini doldurur ve bittiğinde kaynak listesini çeker
async function loadCities() {
  try {
    const res = await fetch("/api/cities?flat=1");
    const cities = await res.json();

    const sel = document.getElementById("provinceSelect");
    sel.innerHTML = '<option value="">Şehir seç…</option>';

    cities.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;      // city_id
      o.textContent = c.name;
      sel.appendChild(o);
    });

    // İlk şehir otomatik seçilsin istersen:
    if (!sel.value && cities[0]) sel.value = cities[0].id;

    // Şehirler yüklendikten sonra listeyi getir
    await loadSources();
  } catch (err) {
    console.error("Şehirler yüklenemedi:", err);
    errMsg("Şehir listesi yüklenemedi.");
  }
}

// Seçilen şehre göre kaynakları listeler
async function loadSources() {
  const tableBody = document.getElementById("sourcesTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "<tr><td colspan='5'>Yükleniyor...</td></tr>";

  try {
    const cityId = document.getElementById("provinceSelect").value;
    const url = cityId ? `/api/sources?city_id=${encodeURIComponent(cityId)}` : "/api/sources";
    const res = await fetch(url);
    const json = await res.json();
    const data = json.data || [];

    if (data.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='5' class='muted'>Bu şehir için kaynak yok.</td></tr>";
      return;
    }

    tableBody.innerHTML = "";
    data.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td><a href="${s.rss_url}" target="_blank" rel="noreferrer">${s.rss_url}</a></td>
        <td>${s.website_url ? `<a href="${s.website_url}" target="_blank" rel="noreferrer">${s.website_url}</a>` : '-'}</td>
        <td>${s.is_active ? "✅" : "❌"}</td>
        <td>${new Date(s.created_at).toLocaleString("tr-TR")}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Kaynaklar yüklenemedi:", err);
    tableBody.innerHTML = "<tr><td colspan='5'>Hata oluştu</td></tr>";
  }
}

// Yeni kaynak ekler
async function addSource(e) {
  e.preventDefault();

  const city_id = Number(document.getElementById("provinceSelect").value);
  const name     = document.getElementById("sourceName").value.trim();
  const rss_url  = document.getElementById("rssUrl").value.trim();
  const website  = document.getElementById("siteUrl").value.trim();

  if (!city_id || !name || !rss_url) {
    errMsg("Şehir, ad ve RSS URL zorunlu.");
    return;
  }

  const addBtn = document.getElementById("addBtn");
  if (addBtn) addBtn.disabled = true;

  const body = { city_id, name, rss_url };
  if (website) body.website_url = website;

  try {
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "Kaynak eklenemedi.");

    okMsg("Kaynak eklendi.");
    // Formu temizle ama şehir seçimini koru
    const form = document.getElementById("sourceForm");
    form && form.reset();
    document.getElementById("provinceSelect").value = String(city_id);

    await loadSources();
  } catch (err) {
    console.error("Kaynak eklenemedi:", err);
    errMsg(err.message || "Kaynak eklenemedi.");
  } finally {
    if (addBtn) addBtn.disabled = false;
  }
}

// Sayfa yüklenince başlat ve event'leri bağla
document.addEventListener("DOMContentLoaded", () => {
  loadCities(); // bitince loadSources() zaten çağrılıyor

  const form = document.getElementById("sourceForm");
  if (form) form.addEventListener("submit", addSource);

  const sel = document.getElementById("provinceSelect");
  if (sel) sel.addEventListener("change", loadSources);
});
