
(() => {
  // Basit kimlik doğrulama (gerçek projede güvenli olmalı)
  const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "admin123"
  };

  let currentPage = 1;
  const itemsPerPage = 20;
  let totalItems = 0;

  // DOM elements
  const loginSection = document.getElementById("loginSection");
  const adminSection = document.getElementById("adminSection");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeText = document.getElementById("welcomeText");
  const newsTableBody = document.getElementById("newsTableBody");
  const totalNewsEl = document.getElementById("totalNews");
  const aiNewsEl = document.getElementById("aiNews");
  const todayNewsEl = document.getElementById("todayNews");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");
  const clearAllBtn = document.getElementById("clearAllBtn");
  
  // Navigation elements
  const navBtns = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".section");
  
  // City sources elements
  const citySelect = document.getElementById("citySelect");
  const citySourceForm = document.getElementById("citySourceForm");
  const selectedCityTitle = document.getElementById("selectedCityTitle");
  const sourceName = document.getElementById("sourceName");
  const sourceUrl = document.getElementById("sourceUrl");
  const sourceCategory = document.getElementById("sourceCategory");
  const addSourceBtn = document.getElementById("addSourceBtn");
  const sourcesList = document.getElementById("sourcesList");
  
  // Sample city sources data (in real app, this would come from database)
  let citySources = {
    "Sivas": [
      {name: "Sivas Haber", url: "https://sivashaber.com", category: "şikayet"},
      {name: "Sivas Gündem", url: "https://sivasgundem.com", category: "öneri"}
    ],
    "Ankara": [
      {name: "Ankara Haberleri", url: "https://ankarahaberleri.com", category: "soru"}
    ]
  };

  // Check if already logged in
  if (sessionStorage.getItem("adminLoggedIn") === "true") {
    showAdminPanel();
  }

  // Login form handler
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      sessionStorage.setItem("adminLoggedIn", "true");
      loginError.classList.add("hidden");
      showAdminPanel();
    } else {
      loginError.textContent = "Kullanıcı adı veya şifre hatalı!";
      loginError.classList.remove("hidden");
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("adminLoggedIn");
    adminSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    loginForm.reset();
  });

  // Clear all news handler
  // Navigation handlers
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      switchSection(section);
    });
  });
  
  // City source handlers
  citySelect.addEventListener("change", () => {
    const selectedCity = citySelect.value;
    if (selectedCity) {
      showCitySourceForm(selectedCity);
      loadCitySources(selectedCity);
    } else {
      hideCitySourceForm();
      sourcesList.innerHTML = "<p>Bir şehir seçin...</p>";
    }
  });
  
  addSourceBtn.addEventListener("click", () => {
    const city = citySelect.value;
    const name = sourceName.value.trim();
    const url = sourceUrl.value.trim();
    const category = sourceCategory.value;
    
    if (!city || !name || !url) {
      alert("Lütfen tüm alanları doldurun!");
      return;
    }
    
    addCitySource(city, { name, url, category });
    sourceName.value = "";
    sourceUrl.value = "";
    loadCitySources(city);
  });

  clearAllBtn.addEventListener("click", async () => {
    if (!confirm("Tüm haberleri silmek istediğinizden emin misiniz?")) return;

    try {
      const response = await fetch("/api/news", {
        method: "DELETE",
        headers: {
          "x-api-key": "SENIN_API_KEYIN" // Aynı API key
        }
      });

      if (response.ok) {
        alert("Tüm haberler başarıyla silindi!");
        loadStats();
        loadNews();
      } else {
        alert("Haber silme işlemi başarısız!");
      }
    } catch (error) {
      console.error("Clear all error:", error);
      alert("Bir hata oluştu!");
    }
  });

  // Pagination handlers
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadNews();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPage * itemsPerPage < totalItems) {
      currentPage++;
      loadNews();
    }
  });

  function showAdminPanel() {
    loginSection.classList.add("hidden");
    adminSection.classList.remove("hidden");
    welcomeText.textContent = `Hoşgeldiniz, ${ADMIN_CREDENTIALS.username}`;
    switchSection("dashboard");
  }
  
  function switchSection(sectionName) {
    // Update navigation buttons
    navBtns.forEach(btn => {
      if (btn.dataset.section === sectionName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    
    // Update sections
    sections.forEach(section => {
      if (section.id === sectionName + "Section") {
        section.classList.add("active");
        section.style.display = "block";
      } else {
        section.classList.remove("active");
        section.style.display = "none";
      }
    });
    
    // Load appropriate data
    if (sectionName === "dashboard") {
      loadStats();
    } else if (sectionName === "news-list") {
      loadNews();
    }
  }
  
  function showCitySourceForm(city) {
    citySourceForm.classList.remove("hidden");
    selectedCityTitle.textContent = `${city} için Kaynak Ekle`;
  }
  
  function hideCitySourceForm() {
    citySourceForm.classList.add("hidden");
  }
  
  function addCitySource(city, source) {
    if (!citySources[city]) {
      citySources[city] = [];
    }
    citySources[city].push(source);
    
    // In real app, this would be saved to database
    console.log("Added source:", { city, source });
    alert(`${source.name} kaynağı ${city} şehrine eklendi!`);
  }
  
  function loadCitySources(city) {
    const sources = citySources[city] || [];
    
    if (sources.length === 0) {
      sourcesList.innerHTML = `<p>${city} için henüz kaynak eklenmemiş.</p>`;
      return;
    }
    
    sourcesList.innerHTML = sources.map(source => `
      <div class="source-item">
        <h4>${escapeHtml(source.name)}</h4>
        <p>Kategori: <span style="background:var(--pill); padding:2px 6px; border-radius:4px">${escapeHtml(source.category)}</span></p>
        <a href="${escapeHtml(source.url)}" target="_blank">${escapeHtml(source.url)}</a>
      </div>
    `).join("");
  }

  async function loadStats() {
    try {
      // Total news count
      const totalResponse = await fetch("/api/news/count");
      const totalData = await totalResponse.json();
      totalNewsEl.textContent = totalData.ok ? totalData.count : "0";

      // AI processed news
      const aiResponse = await fetch("/api/ai-news?limit=1000");
      const aiData = await aiResponse.json();
      aiNewsEl.textContent = aiData.ok ? aiData.count : "0";

      // Today's news
      const today = new Date().toISOString().split('T')[0];
      const todayResponse = await fetch(`/api/news?limit=1000&order=desc`);
      const todayData = await todayResponse.json();
      
      if (todayData.ok && Array.isArray(todayData.data)) {
        const todayCount = todayData.data.filter(item => {
          const itemDate = new Date(item.createdAt || item.publishedAt).toISOString().split('T')[0];
          return itemDate === today;
        }).length;
        todayNewsEl.textContent = todayCount;
      } else {
        todayNewsEl.textContent = "0";
      }

    } catch (error) {
      console.error("Stats loading error:", error);
      totalNewsEl.textContent = "Hata";
      aiNewsEl.textContent = "Hata";
      todayNewsEl.textContent = "Hata";
    }
  }

  async function loadNews() {
    try {
      document.body.classList.add("loading");
      
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await fetch(`/api/news?limit=${itemsPerPage}&offset=${offset}&order=desc`);
      const data = await response.json();

      if (data.ok && Array.isArray(data.data)) {
        totalItems = data.count || 0;
        renderNewsTable(data.data);
        updatePagination();
      } else {
        newsTableBody.innerHTML = "<tr><td colspan='6'>Haber bulunamadı</td></tr>";
      }

    } catch (error) {
      console.error("News loading error:", error);
      newsTableBody.innerHTML = "<tr><td colspan='6'>Hata oluştu</td></tr>";
    } finally {
      document.body.classList.remove("loading");
    }
  }

  function renderNewsTable(news) {
    newsTableBody.innerHTML = news.map(item => {
      const publishedAt = item.publishedAt || item.createdAt;
      const date = publishedAt ? new Date(publishedAt).toLocaleString("tr-TR") : "Bilinmiyor";
      
      return `
        <tr>
          <td>
            <a href="${escapeHtml(item.url)}" target="_blank" style="color:#0b57d0; text-decoration:none">
              ${escapeHtml(item.title || "Başlık yok")}
            </a>
          </td>
          <td>${escapeHtml(item.province || "-")}</td>
          <td>
            <span style="background:var(--pill); padding:2px 6px; border-radius:12px; font-size:12px">
              ${escapeHtml(item.category || "-")}
            </span>
          </td>
          <td>${escapeHtml(item.source || "-")}</td>
          <td style="font-size:12px">${date}</td>
          <td>
            <button onclick="deleteNews('${item.id}')" class="btn btn-danger" style="padding:4px 8px; font-size:12px">
              Sil
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function updatePagination() {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages} (${totalItems} kayıt)`;
  }

  // Global function for delete button
  window.deleteNews = async function(newsId) {
    if (!confirm("Bu haberi silmek istediğinizden emin misiniz?")) return;

    try {
      // Note: Bu endpoint mevcut değil, sadece UI için placeholder
      // Gerçek implementation için backend'e DELETE /api/news/:id endpoint'i eklenebilir
      console.log("Delete news with ID:", newsId);
      alert("Silme özelliği henüz implement edilmedi. Console'da ID görülebilir.");
      
      // Şimdilik listeyi yenile
      loadStats();
      loadNews();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Silme işlemi başarısız!");
    }
  };

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
