
(() => {
  // ====== Login Sistemi ======
  const LOGIN_CREDENTIALS = {
    username: "admin",
    password: "admin123"
  };

  // ====== Ayarlar / API anahtarı (opsiyonel) ======
  const API_KEY = "SENIN_API_KEYIN";

  // ---- UI state
  const state = {
    province: "Sivas",
    category: "all",
    q: "",
    limit: 50,
  };

  // ---- DOM refs
  const loginEls = {
    loginSection: document.getElementById("loginSection"),
    mainApp: document.getElementById("mainApp"),
    loginForm: document.getElementById("loginForm"),
    loginError: document.getElementById("loginError"),
    logoutBtn: document.getElementById("logoutBtn"),
    username: document.getElementById("username"),
    password: document.getElementById("password")
  };

  const els = {
    province: document.getElementById("province"),
    search: document.getElementById("search"),
    chips: document.getElementById("chips"),
    refresh: document.getElementById("btn-refresh"),
    meta: document.getElementById("meta"),
    list: document.getElementById("list"),
  };

  // ---- Login Functions ----
  function checkAuth() {
    return sessionStorage.getItem("userLoggedIn") === "true";
  }

  function showLoginForm() {
    loginEls.loginSection.classList.remove("hidden");
    loginEls.mainApp.classList.add("hidden");
  }

  function showMainApp() {
    loginEls.loginSection.classList.add("hidden");
    loginEls.mainApp.classList.remove("hidden");
    // İl bilgisini yeniden set et ve verileri yükle
    els.province && (els.province.value = state.province);
    loadList();
  }

  function login(username, password) {
    if (username === LOGIN_CREDENTIALS.username && password === LOGIN_CREDENTIALS.password) {
      sessionStorage.setItem("userLoggedIn", "true");
      loginEls.loginError.classList.add("hidden");
      showMainApp();
      return true;
    } else {
      loginEls.loginError.textContent = "Kullanıcı adı veya şifre hatalı!";
      loginEls.loginError.classList.remove("hidden");
      return false;
    }
  }

  function logout() {
    sessionStorage.removeItem("userLoggedIn");
    showLoginForm();
    loginEls.loginForm.reset();
  }

  // ---- Login Event Listeners ----
  loginEls.loginForm && loginEls.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = loginEls.username.value.trim();
    const password = loginEls.password.value;
    login(username, password);
  });

  loginEls.logoutBtn && loginEls.logoutBtn.addEventListener("click", logout);

  // ---- helpers (aynı kaldı) ----
  function qs() {
    const u = new URLSearchParams();
    if (state.province) u.set("province", state.province);
    if (state.category && state.category !== "all") u.set("category", state.category);
    if (state.q) u.set("q", state.q);
    if (state.limit) u.set("limit", String(state.limit));
    return u.toString();
  }

  async function fetchJSON(url, options) {
    const headers = { Accept: "application/json" };
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

  const showTag = (raw) => {
    const t = String(raw || "").trim();
    if (!t) return "";
    return t.startsWith("#") ? t : `#${t}`;
  };

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

  // ---- Main App Events (aynı kaldı) ----
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

  // ---- Initialize ----
  window.addEventListener("DOMContentLoaded", () => {
    if (checkAuth()) {
      showMainApp();
    } else {
      showLoginForm();
    }
  });
})();
