// scripts/migrate.js
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

dotenv.config({ override: true });

const url =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@127.0.0.1:5432/pressdb?sslmode=disable";

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    console.log("1) Tabloyu oluştur (varsa atla)");
    await client.query(`
      create table if not exists news (
        id            text primary key,
        source        text not null,
        province      text not null,
        title         text not null,
        url           text not null,                 -- DİKKAT: BURADA 'unique' YOK
        category      text not null check (category in ('şikayet','soru','öneri','istek')),
        tags          text[],
        summary       text,
        published_at  timestamptz,
        tweet_text    text,
        created_at    timestamptz not null default now(),
        fingerprint   text                            -- yeni sütun (null olabilir, az sonra dolduruyoruz)
      );
    `);

    console.log("2) İndeksleri (vardıysa atlayarak) kur");
    await client.query(`
      create index if not exists idx_news_published on news (coalesce(published_at, created_at) desc);
      create index if not exists idx_news_tags on news using gin (tags);
    `);

    console.log("3) fingerprint sütununu garanti altına al");
    await client.query(`
      alter table news add column if not exists fingerprint text;
    `);

    console.log("4) fingerprint'i mevcut satırlar için doldur (url + tweet_text)");
    await client.query(`
      update news
         set fingerprint = md5(coalesce(url,'') || '|' || coalesce(tweet_text,''))
       where fingerprint is null
    `);

    console.log("5) URL üzerindeki unique kısıt/index'i kaldır (varsa)");
    // constraint adı genelde 'news_url_key' olur
    try {
      await client.query(`alter table news drop constraint news_url_key`);
      console.log("   - constraint news_url_key kaldırıldı");
    } catch {
      console.log("   - constraint yok, geçiyorum");
    }
    // bazı kurulumlarda ayrıca uniq index ayrı isimle olabilir
    await client.query(`drop index if exists news_url_key`);
    await client.query(`drop index if exists idx_news_url`);

    console.log("6) fingerprint çakışmaları varsa temizle (yenisini bırak)");
    await client.query(`
      delete from news a
      using news b
      where a.fingerprint = b.fingerprint
        and (
          a.created_at < b.created_at
          or (a.created_at = b.created_at and a.ctid < b.ctid)
        )
    `);

    console.log("7) fingerprint'e unique index koy");
    await client.query(`
      create unique index if not exists news_fingerprint_key on news(fingerprint)
    `);

    console.log("✅ migration ok");
  } catch (e) {
    console.error("❌ migration error:", e);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌ migration fatal:", e);
  process.exit(1);
});
