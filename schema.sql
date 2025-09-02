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

create index if not exists idx_news_province   on public.news (lower(province));
create index if not exists idx_news_category   on public.news (category);
create index if not exists idx_news_created_at on public.news (coalesce(published_at, created_at) desc);
create index if not exists idx_news_tags_gin   on public.news using gin (tags);
