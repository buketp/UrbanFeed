-- === CITIES ===
create table if not exists public.cities (
  id         serial primary key,
  name       text not null unique,
  code       smallint unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- === SOURCES ===
create table if not exists public.sources (
  id          text primary key,  -- uuid (node tarafında üretiyoruz)
  city_id     integer not null references public.cities(id) on delete cascade,
  name        text not null,
  rss_url     text not null unique,
  website_url text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_sources_city on public.sources(city_id);

-- === NEWS (URL unique DEĞİL; fingerprint ile tekilleştirme) ===
create table if not exists public.news (
  id            text primary key,
  -- FK'ler (opsiyonel doldurulur; geriye uyumluluk için source/province metinleri de duruyor)
  source_id     text references public.sources(id),
  city_id       integer references public.cities(id),

  source        text not null,
  province      text not null,

  title         text not null,
  url           text not null,  -- UNIQUE DEĞİL!
  fingerprint   text,           -- normalize(URL) → md5

  category      text not null check (category in ('şikayet','soru','öneri','istek')),
  tags          text[],
  summary       text,
  published_at  timestamptz,
  tweet_text    text,
  created_at    timestamptz not null default now()
);

-- Tekilleştirme ve performans index'leri
create unique index if not exists uniq_news_fingerprint on public.news(fingerprint);
create index if not exists idx_news_time      on public.news (coalesce(published_at, created_at));
create index if not exists idx_news_city      on public.news (city_id);
create index if not exists idx_news_source    on public.news (source_id);
create index if not exists idx_news_category  on public.news (category);
create index if not exists idx_news_province  on public.news (province);
create index if not exists idx_news_tags      on public.news using gin (tags);
