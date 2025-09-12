// index.js (ESM)
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import crypto from "node:crypto";
const { Pool } = pkg;

dotenv.config();

function maskDbUrl(url) {
  if (!url) return "MISSING";
  return url.replace(/:\/\/([^@]+)@/, "://***:***@");
}
console.log("[BOOT] DATABASE_URL =", maskDbUrl(process.env.DATABASE_URL));

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// ---------- ESM ortamında __dirname ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- PostgreSQL Pool ----------
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@127.0.0.1:5432/pressdb?sslmode=disable",
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // prod DB'lerde genelde SSL gerekir, lokalde kapalı
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Başlangıçta DB testi
pool
  .connect()
  .then((client) => {
    console.log("✅ PostgreSQL bağlantısı başarılı");
    client.release();
  })
  .catch((err) => {
    console.error("❌ PostgreSQL bağlantı hatası:", err.message);
  });

/* ----------------------- Helpers ----------------------- */
function ensureStringArray(val) {
  if (!Array.isArray(val)) return [];
  return val
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}
function toIsoOrNull(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString();
}
function parseBooleanish(v, fallback = false) {
  if (v === undefined || v === null) return fallback;
  const s = String(v).toLowerCase().trim();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
}

/* ---------- URL normalize + fingerprint (yalnız URL’e göre) ---------- */
function normalizeUrl(raw) {
  try {
    const u = new URL(String(raw).trim());
    u.hash = ""; // #... kaldır
    const trash = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "ref",
    ];
    trash.forEach((k) => u.searchParams.delete(k));
    let s = u.toString();
    s = s.replace(/\?$/, ""); // boş ? varsa at
    s = s.replace(/\/$/, ""); // sondaki /'ı kaldır
    return s.toLowerCase();
  } catch {
    return String(raw).trim().toLowerCase().replace(/[#?].*$/, "").replace(/\/$/, "");
  }
}
function fingerprintFromUrl(rawUrl) {
  const canonical = normalizeUrl(rawUrl);
  return crypto.createHash("md5").update(canonical).digest("hex");
}

/* ------------------------- Tek haber okuma (opsiyonel) ------------------------- */
async function fetchNewsByUrl(url) {
  const q = `
    select id,
           created_at   as "createdAt",
           source, province, title, url, category, tags, summary,
           published_at as "publishedAt",
           tweet_text   as "tweetText"
      from news
     where url = $1
     limit 1
  `;
  const r = await pool.query(q, [url]);
  return r.rows[0] || null;
}

/* ------------------------- Cities / Sources tabloları ------------------------- */
async function ensureCitiesTable(pool) {
  await pool.query(`
    create table if not exists public.cities (
      id serial primary key,
      name text not null unique,
      code smallint unique,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `);
}
async function ensureSourcesTable(pool) {
  await pool.query(`
    create table if not exists public.sources (
      id text primary key,
      city_id integer not null references public.cities(id) on delete cascade,
      name text not null,
      rss_url text not null unique,
      website_url text,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    );
    create index if not exists idx_sources_city on public.sources (city_id);
  `);
}

/* -------------------- News sütun + index (fingerprint & ilişkiler) -------------------- */
async function ensureNewsIndexes(pool) {
  console.log("→ Ensuring news indexes...");

  // Gerekli sütunlar
  await pool.query(`
    ALTER TABLE IF EXISTS public.news
      ADD COLUMN IF NOT EXISTS fingerprint text;
  `);
  await pool.query(`
    ALTER TABLE IF EXISTS public.news
      ADD COLUMN IF NOT EXISTS city_id integer;
  `);
  await pool.query(`
    ALTER TABLE IF EXISTS public.news
      ADD COLUMN IF NOT EXISTS source_id text;
  `);

  // Benzersizlik (dup engelleme) — migrasyonla aynı isim: news_fingerprint_key
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'news_fingerprint_key'
          AND n.nspname = 'public'
      ) THEN
        CREATE UNIQUE INDEX news_fingerprint_key ON public.news(fingerprint);
      END IF;
    END$$;
  `);

  // Performans index'leri
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_news_time
    ON public.news ((coalesce(published_at, created_at)));
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_news_province
    ON public.news (province);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_news_category
    ON public.news (category);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_news_tags
    ON public.news USING gin (tags);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_news_city
    ON public.news (city_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_news_source_id
    ON public.news (source_id);
  `);

  console.log("✅ news indexes ok");
}

/* -------------------- 81 ili bir defaya mahsus seed et -------------------- */
async function seedCitiesIfEmpty(pool) {
  const check = await pool.query("select count(*)::int as c from public.cities");
  if (check.rows[0].c > 0) return;

  const provinces = [
    "Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın",
    "Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum",
    "Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun",
    "Gümüşhane","Hakkari","Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri",
    "Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin",
    "Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas",
    "Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray",
    "Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük",
    "Kilis","Osmaniye","Düzce"
  ];
  const insert = `insert into public.cities (name, code)
                  values ($1, $2) on conflict (name) do nothing`;

  for (let i = 0; i < provinces.length; i++) {
    await pool.query(insert, [provinces[i], i + 1]);
  }
  console.log("✅ Seeded 81 cities");
}

/* ---------------------------- ID çözümleyen yardımcılar ---------------------------- */
async function findCityIdByName(name) {
  if (!name) return null;
  const r = await pool.query(
    "select id from public.cities where lower(name)=lower($1) limit 1",
    [String(name)]
  );
  return r.rows[0]?.id ?? null;
}

async function resolveSourceId({ source_id, rss_url, name, city_id }) {
  // 1) Doğrudan source_id verilmişse
  if (source_id) return source_id;

  // 2) rss_url üzerinden eşle
  if (rss_url) {
    const r = await pool.query(
      "select id from public.sources where rss_url=$1 limit 1",
      [rss_url]
    );
    if (r.rows[0]?.id) return r.rows[0].id;
  }

  // 3) name + city_id (daha güçlü eşleşme)
  if (name && city_id) {
    const r = await pool.query(
      "select id from public.sources where name=$1 and city_id=$2 limit 1",
      [name, city_id]
    );
    if (r.rows[0]?.id) return r.rows[0].id;
  }

  // 4) sadece name (en zayıf)
  if (name) {
    const r = await pool.query(
      "select id from public.sources where name=$1 limit 1",
      [name]
    );
    if (r.rows[0]?.id) return r.rows[0].id;
  }

  return null;
}

/* ---------------------------- Middleware ---------------------------- */
app.disable("x-powered-by");
app.disable("etag"); // agresif cache kapalı
app.use((req, res, next) => {
  res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));

// Hit log
app.use((req, _res, next) => {
  console.log("HIT:", req.method, req.url, "Host:", req.headers.host);
  next();
});

// ---------- Statik UI ----------
app.use(express.static(path.join(__dirname, "public"), { etag: false, maxAge: 0 }));

// ---------- Health / Whoami ----------
app.get("/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true, db: "up", uptime: process.uptime() });
  } catch (e) {
    res.status(500).json({ ok: false, db: "down", error: e.message });
  }
});
app.get("/__whoami", (req, res) => {
  res.json({
    host: req.headers.host,
    slug: process.env.REPL_SLUG,
    owner: process.env.REPL_OWNER,
    now: new Date().toISOString(),
  });
});

// ---------- API key (sadece /api/news POST’ta kullanıyoruz) ----------
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!API_KEY) return res.status(500).json({ error: "API_KEY tanımlı değil." });
  if (!key || key !== API_KEY) return res.status(401).json({ error: "Geçersiz API anahtarı." });
  next();
}

/* -------------------------- Şemalar -------------------------- */
const NewsSchema = z.object({
  // Artık opsiyonel: sadece source_id ile de çalışsın
  source: z.string().min(2).optional(),
  province: z.string().min(2).optional(),

  title: z.string().min(5),
  url: z.string().url(),
  category: z.enum(["şikayet", "soru", "öneri", "istek"]),
  tags: z.array(z.string().min(1)).max(5).optional(),
  summary: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(10).optional(),
  ),
  publishedAt: z.string().datetime().optional(),
  tweetText: z.string().max(280).optional(),

  // Yeni alanlar (opsiyonel; varsa bağlarız)
  city_id: z.coerce.number().int().positive().optional(),
  source_id: z.string().optional(), // uuid zorunluluğu kaldırıldı
  rss_url: z.string().url().optional(),
});

const SourceSchema = z.object({
  city_id: z.coerce.number().int().positive(),
  name: z.string().min(2),
  rss_url: z.string().url(),
  website_url: z.string().url().optional(),
  is_active: z.coerce.boolean().optional(),
});

/* -------------------------- NEWS: CREATE -------------------------- */
app.post("/api/news", requireApiKey, async (req, res) => {
  console.log(">>> Yeni haber isteği geldi:", JSON.stringify(req.body, null, 2));

  const parsed = NewsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Doğrulama hatası", details: parsed.error.flatten() });
  }

  const d = parsed.data;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const tags = ensureStringArray(d.tags);
  const pubAt = toIsoOrNull(d.publishedAt);

  // URL normalize + fingerprint (dup’ları durdurur)
  const canonicalUrl = normalizeUrl(d.url);
  const fp = fingerprintFromUrl(canonicalUrl);

  // 1) Eğer source_id verildiyse, kaynağı DB'den çek
  let srcRow = null;
  if (d.source_id) {
    const r = await pool.query(
      `select id, name, city_id from public.sources where id=$1 limit 1`,
      [d.source_id],
    );
    srcRow = r.rows[0] || null;
    if (!srcRow) {
      return res.status(400).json({ error: "Geçersiz source_id" });
    }
  }

  // 2) city_id çöz: öncelik sırası -> d.city_id -> srcRow.city_id -> province adı
  let cityId = d.city_id ?? srcRow?.city_id ?? (await findCityIdByName(d.province));

  // 3) source_id çöz: öncelik sırası -> d.source_id -> resolveSourceId(...)
  let srcId =
    d.source_id ??
    (await resolveSourceId({
      source_id: undefined,
      rss_url: d.rss_url,
      name: d.source ?? srcRow?.name,
      city_id: cityId ?? null,
    })) ??
    srcRow?.id ??
    null;

  // 4) source adı ve province: kaynak/şehirden türet
  let sourceName = d.source ?? srcRow?.name ?? "Bilinmeyen Kaynak";
  let province = d.province ?? null;

  if (!province && cityId) {
    const q = await pool.query(`select name from public.cities where id=$1`, [cityId]);
    if (q.rowCount) province = q.rows[0].name;
  }

  try {
    const insertSql = `
      insert into news
        (id, fingerprint, source, province, title, url, category, tags, summary,
         published_at, tweet_text, created_at, city_id, source_id)
      values
        ($1, $2,         $3,     $4,      $5,   $6,  $7,       $8::text[], $9,
         coalesce($10::timestamptz, now()), $11, now(), $12, $13)
      on conflict (fingerprint) do update
      set
        tweet_text   = coalesce(excluded.tweet_text, news.tweet_text),
        tags         = case
                         when excluded.tags is not null then (
                           select array(
                             select distinct t
                             from unnest(coalesce(news.tags,'{}') || coalesce(excluded.tags,'{}')) t
                           )
                         )
                         else news.tags
                       end,
        category     = coalesce(excluded.category, news.category),
        source       = coalesce(excluded.source,   news.source),
        province     = coalesce(excluded.province, news.province),
        title        = coalesce(excluded.title,    news.title),
        summary      = coalesce(excluded.summary,  news.summary),
        url          = coalesce(excluded.url,      news.url),
        published_at = coalesce(excluded.published_at, news.published_at),
        city_id      = coalesce(excluded.city_id,  news.city_id),
        source_id    = coalesce(excluded.source_id,news.source_id)
      returning id, source, province, title, url, category, tags, summary,
                published_at as "publishedAt", tweet_text as "tweetText",
                created_at as "createdAt",
                city_id as "cityId", source_id as "sourceId";
    `;
    const insertVals = [
      id, fp, sourceName, province ?? "", d.title, canonicalUrl,
      d.category, tags, d.summary ?? null, pubAt, d.tweetText ?? null,
      cityId ?? null, srcId ?? null,
    ];
    const r = await pool.query(insertSql, insertVals);
    return res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (e) {
    console.error("DB upsert error:", e);
    res.status(500).json({ ok: false, error: "DB upsert error", detail: e.message });
  }
});

/* -------------------------- NEWS: LIST -------------------------- */
async function getNewsHandler(req, res) {
  const {
    source, province, category, q,
    limit = 50, offset = 0, order = "desc",
    aiOnly: aiOnlyParam,
    city_id, source_id,
  } = req.query;

  const aiOnly = parseBooleanish(aiOnlyParam, false);

  const where = [];
  const params = [];

  if (source)   { params.push(String(source));   where.push(`source = $${params.length}`); }
  if (province) { params.push(String(province)); where.push(`lower(province) = lower($${params.length})`); }
  if (category) { params.push(String(category)); where.push(`category = $${params.length}`); }
  if (city_id)  { params.push(Number(city_id));  where.push(`city_id = $${params.length}`); }
  if (source_id){ params.push(String(source_id));where.push(`source_id = $${params.length}`); }
  if (aiOnly)   { where.push(`tweet_text is not null and length(trim(tweet_text)) > 0`); }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    const i = params.length;
    where.push(
      `(lower(title) like $${i} or lower(summary) like $${i} or lower(tweet_text) like $${i} or
        exists (select 1 from unnest(coalesce(tags, '{}')) t where lower(t) like $${i}))`,
    );
  }

  // limit/offset güvenliği
  const rawLimit = parseInt(limit, 10);
  const safeLimit = Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 500 ? rawLimit : 50;
  const rawOffset = parseInt(offset, 10);
  const safeOffset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  params.push(safeLimit, safeOffset);

  const direction = String(order).toLowerCase() === "asc" ? "asc" : "desc";

  const sql = `
    select id,
           created_at   as "createdAt",
           source, province, title, url, category, tags, summary,
           published_at as "publishedAt",
           tweet_text   as "tweetText",
           city_id      as "cityId",
           source_id    as "sourceId"
      from news
     ${where.length ? "where " + where.join(" and ") : ""}
     order by coalesce(published_at, created_at) ${direction}
     limit $${params.length - 1}
     offset $${params.length};
  `;

  try {
    const r = await pool.query(sql, params);
    res.json({ ok: true, aiOnly, count: r.rowCount, data: r.rows });
  } catch (e) {
    console.error("DB query error:", e);
    res.status(500).json({ ok: false, error: "DB query error", detail: e.message });
  }
}

app.get("/api/news", getNewsHandler);

// Sadece AI içerenler (kısa yol)
app.get("/api/ai-news", (req, res) => {
  req.query.aiOnly = "true";
  return getNewsHandler(req, res);
});

// Ek debug
app.get("/api/news/count", async (_req, res) => {
  try {
    const r = await pool.query("select count(*) from news");
    res.json({ ok: true, count: Number(r.rows[0].count) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.get("/api/news/last", async (_req, res) => {
  try {
    const r = await pool.query(`
      select id, title, url, category, tags, created_at
        from news
    order by created_at desc
       limit 1
    `);
    res.json({ ok: true, last: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Tüm haberleri sil (geliştirme amaçlı)
app.delete("/api/news", requireApiKey, async (_req, res) => {
  try {
    await pool.query("truncate table news restart identity;");
    res.json({ ok: true, message: "Tüm haberler silindi." });
  } catch (e) {
    console.error("DB truncate error:", e);
    res.status(500).json({ ok: false, error: "DB truncate error", detail: e.message });
  }
});

/* -------------------- Cities & Sources API -------------------- */
app.get("/api/cities", async (req, res) => {
  try {
    const { flat } = req.query;
    const r = await pool.query(
      "select id, name, code from public.cities where is_active = true order by name asc",
    );
    if (flat === "1" || flat === "true") {
      return res.json(r.rows);
    }
    return res.json({ ok: true, data: r.rows });
  } catch (e) {
    console.error("cities error:", e);
    res.status(500).json({ ok: false, error: "cities_failed", detail: e.message });
  }
});
app.get("/api/sources", async (req, res) => {
  try {
    const { city_id, is_active } = req.query;
    const clauses = [];
    const vals = [];
    if (city_id) {
      clauses.push(`city_id = $${vals.push(Number(city_id))}`);
    }
    if (is_active !== undefined) {
      clauses.push(`is_active = $${vals.push(parseBooleanish(is_active, true))}`);
    } else {
      clauses.push(`is_active = true`);
    }
    const sql = `
      select id, city_id, name, rss_url, website_url, is_active, created_at
        from public.sources
       ${clauses.length ? "where " + clauses.join(" and ") : ""}
       order by created_at desc
    `;
    const r = await pool.query(sql, vals);
    res.json({ ok: true, count: r.rowCount, data: r.rows });
  } catch (e) {
    console.error("sources list error:", e);
    res.status(500).json({ ok: false, error: "sources_list_failed", detail: e.message });
  }
});
app.post("/api/sources", async (req, res) => {
  try {
    const p = SourceSchema.safeParse(req.body);
    if (!p.success) {
      return res.status(400).json({ ok: false, error: "validation_error", details: p.error.flatten() });
    }
    const d = p.data;

    // Şehir adı webhook için
    const cityQ = await pool.query("select name from public.cities where id = $1", [d.city_id]);
    const cityName = cityQ.rows[0]?.name || null;

    const id = crypto.randomUUID();
    const upsert = `
      insert into public.sources (id, city_id, name, rss_url, website_url, is_active)
      values ($1,$2,$3,$4,$5, coalesce($6, true))
      on conflict (rss_url) do update
      set name = excluded.name,
          website_url = excluded.website_url,
          is_active = true
      returning id, city_id, name, rss_url, website_url, is_active, created_at
    `;
    const vals = [id, d.city_id, d.name, d.rss_url, d.website_url ?? null, d.is_active ?? true];
    const r = await pool.query(upsert, vals);
    const sourceRow = r.rows[0];

    // n8n webhook (varsa)
    const hook = process.env.N8N_SOURCE_ADDED_WEBHOOK;
    if (hook) {
      (async () => {
        try {
          await fetch(hook, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              event: "source_added",
              source: { ...sourceRow, city_name: cityName }
            })
          });
          console.log("→ n8n webhook: source_added gönderildi");
        } catch (err) {
          console.error("n8n webhook err:", err.message);
        }
      })();
    }

    res.status(201).json({ ok: true, source: { ...sourceRow, city_name: cityName } });
  } catch (e) {
    console.error("sources add error:", e);
    res.status(500).json({ ok: false, error: "sources_add_failed", detail: e.message });
  }
});

/* ---------------------------- Admin route ---------------------------- */
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ---------- SPA fallback ----------
app.get(/^\/(?!api)(?!__whoami)(?!health)(?!admin).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ------------------------------ Server ------------------------------ */
(async function bootstrap() {
  try {
    await ensureCitiesTable(pool);
    await ensureSourcesTable(pool);
    await seedCitiesIfEmpty(pool);
    await ensureNewsIndexes(pool);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Local Press API running on http://0.0.0.0:${PORT} (PORT=${PORT})`);
    });
  } catch (err) {
    console.error("Bootstrap error:", err);
    process.exit(1);
  }
})();
