(() => {
  // ====== Ayarlar / API anahtarı (opsiyonel) ======
  // GET isteklerinde zorunlu değil ama sunucunda kontrol varsa doldur:
  const API_KEY = "SENIN_API_KEYIN"; // Replit Secrets'taki ile aynı

  // ---- UI state
  const state = {
    province: "Sivas",
    category: "all",
    q: "",
    limit: 50,
  };

  // ---- DOM refs
  const els = {
    province: document.getElementById("province"),
    search: document.getElementById("search"),
    chips: document.getElementById("chips"),
    refresh: document.getElementById("btn-refresh"),
    meta: document.getElementById("meta"),
    list: document.getElementById("list"),
  };

  // ---- helpers
  function qs() {
    const u = new URLSearchParams();
    if (state.province) u.set("province", state.province);
    if (state.category && state.category !== "all") u.set("category", state.category);
    if (state.q) u.set("q", state.q);
    if (state.limit) u.set("limit", String(state.limit));
    // /api/ai-news zaten aiOnly=true yapıyor; /api/news kullanırsan:
    // u.set("aiOnly", "false");
    return u.toString();
  }

  async function fetchJSON(url, options) {
    const headers = { Accept: "application/json" };
    // API anahtarını opsiyonel olarak gönder
    if (API_KEY && String(API_KEY).trim().length > 0) {
      headers["x-api-key"] = API_KEY;
    }

    const r = await fetch(url, {
      headers,
      cache: "no-store",
      ...options,
    });

    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!r.ok) {
      const msg =
        (data && (data.detail || data.error)) ||
        (text && text.slice(0, 200)) ||
        `HTTP ${r.status}`;
      console.error("fetchJSON error:", { url, status: r.status, msg });
      throw new Error(msg);
    }
    return data ?? {};
  }

  const ESC = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[m]);

  // boş/undefined’ı ayıkla, string’e çevir, kırp
  const toArray = (v) =>
    Array.isArray(v)
      ? v.map((x) => String(x ?? "").trim()).filter(Boolean)
      : typeof v === "string" && v.trim()
      ? [v.trim()]
      : [];

  const uniq = (arr) => [...new Set(arr)];

  const fmtDate = (s) => {
    if (!s) return "";
    const d = new Date(s);
    return isNaN(d) ? "" : d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  };

  // Tag’i tek # ile göster (gelen #’lıysa tekrar ekleme)
  const showTag = (raw) => {
    const t = String(raw || "").trim();
    if (!t) return "";
    return t.startsWith("#") ? t : `#${t}`;
  };

  // ---- normalize backend item (PublishedAt / publishedAt farkını tolere et)
  function normalize(it = {}) {
    const publishedAt = it.publishedAt || it.PublishedAt || it.createdAt || "";
    const tags = uniq(toArray(it.tags));
    return {
      id: it.id || "",
      title: it.title || "",
      url: it.url || "#",
      source: it.source || "",
      province: it.province || "",
      category: it.category || "",
      tweetText: it.tweetText || "",
      publishedAt,
      tags,
    };
  }

  // ---- card renderer (AI text + tags)
  function renderItem(raw) {
    const it = normalize(raw);

    const tagsHtml = it.tags
      .map((t) => `<span class="tag">${ESC(showTag(t))}</span>`)
      .join(" ");

    const catHtml = it.category
      ? `<span class="cat ${ESC(it.category)}">${ESC(it.category)}</span>`
      : "";

    return `
      <div class="card">
        <div style="margin-bottom:6px">
          <a class="title" href="${ESC(it.url)}" target="_blank" rel="noopener noreferrer">
            ${ESC(it.title) || "(başlık yok)"}
          </a>
        </div>
        ${it.tweetText ? `<div class="summary">${ESC(it.tweetText)}</div>` : ''}
        <div class="sub">
          ${ESC(it.province || "-")} • ${catHtml}
          ${it.publishedAt ? ` • ${ESC(fmtDate(it.publishedAt))}` : ""}
        </div>
        ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ""}
      </div>
    `;
  }

  async function loadList() {
    try {
      document.body.classList.add("loading");
      els.list && (els.list.innerHTML = "");
      els.meta && (els.meta.textContent = "Yükleniyor…");

      // Sadece AI metni olan kayıtları çek
      const url = `/api/ai-news?${qs()}`;
      const { ok = false, count = 0, data = [] } = await fetchJSON(url);

      els.meta &&
        (els.meta.textContent = ok
          ? `Toplam haber: ${count}  •  Filtre: ${state.category === "all" ? "Hepsi" : state.category} (${state.province})`
          : "Toplam haber: —");

      if (!ok || !Array.isArray(data) || data.length === 0) {
        els.list && (els.list.innerHTML = `<div class="card">AI mesajlı kayıt bulunamadı.</div>`);
        return;
      }

      els.list && (els.list.innerHTML = data.map(renderItem).join(""));
    } catch (e) {
      els.meta && (els.meta.textContent = "Hata oluştu.");
      els.list && (els.list.innerHTML = `<div class="card">Hata: ${ESC(e.message)}</div>`);
      console.error(e);
    } finally {
      document.body.classList.remove("loading");
    }
  }

  // ---- events
  els.chips &&
    els.chips.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".chip");
      if (!chip) return;
      [...els.chips.querySelectorAll(".chip")].forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.category = chip.dataset.cat || "all";
      loadList();
    });

  els.refresh &&
    els.refresh.addEventListener("click", () => {
      state.province = (els.province?.value || "").trim();
      state.q = (els.search?.value || "").trim();
      loadList();
    });

  els.search &&
    els.search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.q = (els.search.value || "").trim();
        loadList();
      }
    });

  window.addEventListener("DOMContentLoaded", () => {
    els.province && (els.province.value = state.province);
    loadList();
  });
})();
