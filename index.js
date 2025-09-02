import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// ---------- ESM ortamında __dirname ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- PostgreSQL Pool (YEREL) ----------
/*
  .env örneği:
    DATABASE_URL=postgresql://local@127.0.0.1:5432/pressdb
  Yerel Postgres için SSL kullanmıyoruz.
*/
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Başlangıçta test
pool
  .connect()
  .then((client) => {
    console.log("✅ PostgreSQL bağlantısı başarılı");
    client.release();
  })
  .catch((err) => {
    console.error("❌ PostgreSQL bağlantı hatası:", err.message);
  });

// ---------- Helpers ----------
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

// Tek bir haber satırını ortak SELECT ile okuma
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

// ---------- Middleware ----------
app.disable("x-powered-by");

// Cache'i agresif kapat (eski ekran sorununu önler)
app.disable("etag");
app.use((req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));

// Hangi domaine cevap verdiğini görmek için log
app.use((req, _res, next) => {
  console.log("HIT:", req.method, req.url, "Host:", req.headers.host);
  next();
});

// ---------- Statik UI ----------
app.use(
  express.static(path.join(__dirname, "public"), { etag: false, maxAge: 0 }),
);

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

// ---------- API key ----------
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!API_KEY)
    return res.status(500).json({ error: "API_KEY tanımlı değil." });
  if (!key || key !== API_KEY)
    return res.status(401).json({ error: "Geçersiz API anahtarı." });
  next();
}

// ---------- Şema ----------
const NewsSchema = z.object({
  source: z.string().min(2),
  province: z.string().min(2),
  title: z.string().min(5),
  url: z.string().url(),
  category: z.enum(["şikayet", "soru", "öneri", "istek"]),
  tags: z.array(z.string().min(1)).max(5).optional(),

  // ⬇️ Boş string gelirse alanı yok say (optional)
  summary: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(10).optional(),
  ),

  publishedAt: z.string().datetime().optional(),
  tweetText: z.string().max(280).optional(),
});

// ---------- CREATE (Upsert + update) ----------
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

  try {
    const insertSql = `
      insert into news
        (id, source, province, title, url, category, tags, summary, published_at, tweet_text, created_at)
      values
        ($1,  $2,    $3,       $4,   $5,  $6,       $7::text[], $8,    coalesce($9::timestamptz, now()), $10, now())
      on conflict (url) do update
      set
        -- AI'den tweetText geldiyse güncelle
        tweet_text = coalesce(excluded.tweet_text, news.tweet_text),
        -- Tags geldiyse birleştir + uniq
        tags = case
                 when excluded.tags is not null then (
                   select array(
                     select distinct t from unnest(coalesce(news.tags,'{}') || coalesce(excluded.tags,'{}')) as t
                   )
                 )
                 else news.tags
               end,
        -- Boş bırakılmayan alanları tazele (varsa)
        category = coalesce(excluded.category, news.category),
        source   = coalesce(excluded.source,   news.source),
        province = coalesce(excluded.province, news.province),
        title    = coalesce(excluded.title,    news.title),
        summary  = coalesce(excluded.summary,  news.summary),
        published_at = coalesce(excluded.published_at, news.published_at)
      returning id, source, province, title, url, category, tags, summary,
                published_at as "publishedAt", tweet_text as "tweetText",
                created_at as "createdAt";
    `;

    const insertVals = [
      id, d.source, d.province, d.title, d.url, d.category,
      tags, d.summary ?? null, pubAt, d.tweetText ?? null,
    ];

    const r = await pool.query(insertSql, insertVals);
    return res.status(201).json({ ok: true, data: r.rows[0] });
  } catch (e) {
    console.error("DB upsert error:", e);
    res.status(500).json({ ok: false, error: "DB upsert error", detail: e.message });
  }
});


// ---------- READ (liste) ----------
// Ör: /api/news?source=ai&province=Sivas&category=öneri&q=finans&aiOnly=1&limit=50&order=desc
app.get("/api/news", async (req, res) => {
  const {
    source,
    province,
    category,
    q,
    aiOnly,
    limit = 50,
    order = "desc",
  } = req.query;

  const where = [];
  const params = [];

  if (source) {
    params.push(String(source));
    where.push(`source = $${params.length}`);
  }
  if (province) {
    params.push(String(province));
    where.push(`lower(province) = lower($${params.length})`);
  }
  if (category) {
    params.push(String(category));
    where.push(`category = $${params.length}`);
  }
  if (aiOnly === "1") {
    where.push(`tweet_text is not null and length(trim(tweet_text)) > 0`);
  }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    const i = params.length;
    // title / summary / tags / tweet_text içinde ara
    where.push(
      `(lower(title) like $${i} or lower(summary) like $${i} or lower(tweet_text) like $${i} or
        exists (select 1 from unnest(coalesce(tags, '{}')) t where lower(t) like $${i}))`,
    );
  }

  // limit güvenliği
  const rawLimit = parseInt(limit, 10);
  const safeLimit =
    Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 500
      ? rawLimit
      : 50;
  params.push(safeLimit);

  // sıralama
  const direction = String(order).toLowerCase() === "asc" ? "asc" : "desc";

  const sql = `
    select id,
           created_at   as "createdAt",
           source, province, title, url, category, tags, summary,
           published_at as "publishedAt",
           tweet_text   as "tweetText"
      from news
     ${where.length ? "where " + where.join(" and ") : ""}
     order by coalesce(published_at, created_at) ${direction}
     limit $${params.length};
  `;

  try {
    const r = await pool.query(sql, params);
    res.json({ ok: true, count: r.rowCount, data: r.rows });
  } catch (e) {
    console.error("DB query error:", e);
    res
      .status(500)
      .json({ ok: false, error: "DB query error", detail: e.message });
  }
});

// ---------- SADECE AI içeren kayıtlar (kısa yol) ----------
app.get("/api/ai-news", async (req, res) => {
  const { province, category, q, limit = 50, order = "desc" } = req.query;

  const where = ["tweet_text is not null and length(trim(tweet_text)) > 0"];
  const params = [];

  if (province) {
    params.push(String(province));
    where.push(`lower(province) = lower($${params.length})`);
  }
  if (category) {
    params.push(String(category));
    where.push(`category = $${params.length}`);
  }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    const i = params.length;
    where.push(
      `(lower(tweet_text) like $${i} or exists (
         select 1 from unnest(coalesce(tags,'{}')) t where lower(t) like $${i}
       ))`,
    );
  }

  const rawLimit = parseInt(limit, 10);
  const safeLimit =
    Number.isFinite(rawLimit) && rawLimit > 0 && rawLimit <= 500
      ? rawLimit
      : 50;
  params.push(safeLimit);

  const direction = String(order).toLowerCase() === "asc" ? "asc" : "desc";

  const sql = `
    select id,
           created_at   as "createdAt",
           source, province, title, url, category, tags,
           published_at as "publishedAt",
           tweet_text   as "tweetText"
      from news
     where ${where.join(" and ")}
     order by coalesce(published_at, created_at) ${direction}
     limit $${params.length};
  `;

  try {
    const r = await pool.query(sql, params);
    res.json({ ok: true, count: r.rowCount, data: r.rows });
  } catch (e) {
    console.error("DB ai-news error:", e);
    res
      .status(500)
      .json({ ok: false, error: "DB query error", detail: e.message });
  }
});

// ---------- Ek debug endpointler ----------
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

// ---------- DELETE ALL ----------
app.delete("/api/news", requireApiKey, async (_req, res) => {
  try {
    await pool.query("truncate table news restart identity;");
    res.json({ ok: true, message: "Tüm haberler silindi." });
  } catch (e) {
    console.error("DB truncate error:", e);
    res
      .status(500)
      .json({ ok: false, error: "DB truncate error", detail: e.message });
  }
});

// ---------- SPA fallback (API dışı GET istekleri index.html'e düşsün) ----------
app.get(/^\/(?!api)(?!__whoami)(?!health).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- Server ----------
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Local Press API running on http://0.0.0.0:${PORT} (PORT=${PORT})`,
  );
});
