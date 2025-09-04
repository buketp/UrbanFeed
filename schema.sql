create table if not exists public.news (
  id            text primary key,
  source        text not null,
  province      text not null,
  title         text not null,
  url           text not null unique,
  category      text not null check (category in ('şikayet','soru','öneri','istek')),
  tags          text[] default '{}',
  summary       text,
  published_at  timestamptz,
  tweet_text    text,
  created_at    timestamptz not null default now()
);

create unique index if not exists news_url_key on news(url);