// migrate.js
import pkg from "pg";
const { Client } = pkg;

const url = process.env.DATABASE_URL || "postgresql://postgres:password@127.0.0.1:5432/pressdb?sslmode=disable";

const SQL = `
create table if not exists news (
  id           text primary key,
  source       text not null,
  province     text not null,
  title        text not null,
  url          text not null unique,
  category     text not null check (category in ('şikayet','soru','öneri','istek')),
  tags         text[],
  summary      text,
  published_at timestamptz,
  tweet_text   text,
  created_at   timestamptz not null default now()
);

create unique index if not exists idx_news_url on news(url);
create index if not exists idx_news_published on news(coalesce(published_at, created_at) desc);
create index if not exists idx_news_tags on news using gin (tags);
`;

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(SQL);
  await client.end();
  console.log("✅ migration ok");
}

main().catch((e) => {
  console.error("❌ migration error:", e);
  process.exit(0); // start.sh düşmesin
});
