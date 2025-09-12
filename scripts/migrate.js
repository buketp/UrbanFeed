// scripts/migrate.js
import dotenv from "dotenv";
import pkg from "pg";
const { Client } = pkg;

dotenv.config({ override: true });

// Database URL - should be set by start.sh or Secrets/.env
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("❌ DATABASE_URL not set! Migration cannot proceed.");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    console.log("0) cities / sources tablolarını garanti et");
    await client.query(`
      create table if not exists public.cities (
        id serial primary key,
        name text not null unique,
        code smallint unique,
        is_active boolean not null default true,
        created_at timestamptz not null default now()
      );

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

    console.log("1) news tablosunu oluştur / kolonları garanti et");
    await client.query(`
      create table if not exists public.news (
        id            text primary key,
        source        text not null,
        province      text not null,
        title         text not null,
        url           text not null,
        category      text not null check (category in ('şikayet','soru','öneri','istek')),
        tags          text[],
        summary       text,
        published_at  timestamptz,
        tweet_text    text,
        created_at    timestamptz not null default now(),
        fingerprint   text
      );
    `);

    console.log("2) yardımcı indexler (idempotent)");
    await client.query(`
      create index if not exists idx_news_time     on public.news ((coalesce(published_at, created_at)));
      create index if not exists idx_news_province on public.news (province);
      create index if not exists idx_news_category on public.news (category);
      create index if not exists idx_news_tags     on public.news using gin (tags);
    `);

    // === EK: sources <-> news ilişkisi, şehir bazlı filtreler ve backfill ===
    console.log("2.5) news.source_id (FK) + index");
    await client.query(`
      alter table public.news
        add column if not exists source_id text;

      do $$
      begin
        if not exists (
          select 1 from pg_constraint
          where conname = 'fk_news_source'
            and conrelid = 'public.news'::regclass
        ) then
          alter table public.news
            add constraint fk_news_source
            foreign key (source_id) references public.sources(id)
            on delete set null on update cascade;
        end if;
      end$$;

      create index if not exists idx_news_source on public.news(source_id);
    `);

    console.log("2.6) source(name) → source_id backfill (case-insensitive eşleme)");
    await client.query(`
      update public.news n
         set source_id = s.id
        from public.sources s
       where n.source_id is null
         and lower(n.source) = lower(s.name);
    `);

    console.log("2.7) sources (name, city_id) UNIQUE (aynı şehirde aynı isimli kaynağı engelle)");
    // Duplicate varsa constraint eklemeyi atlayıp uyarı veriyoruz
    await client.query(`
      do $$
      declare dup_count int;
      begin
        select count(*) into dup_count
        from (
          select name, city_id, count(*) c
          from public.sources
          group by 1,2
          having count(*) > 1
        ) t;

        if dup_count = 0 then
          if not exists (
            select 1 from pg_constraint
            where conname = 'uniq_sources_name_city'
              and conrelid = 'public.sources'::regclass
          ) then
            alter table public.sources
              add constraint uniq_sources_name_city unique (name, city_id);
          end if;
        else
          raise notice 'Skipping unique(name,city_id) due to % duplicate group(s) in public.sources', dup_count;
        end if;
      end$$;
    `);

    console.log("2.8) province backfill (boş ise sources.city_id → cities.name ile doldur)");
    await client.query(`
      update public.news n
         set province = c.name
        from public.sources s
        join public.cities c on c.id = s.city_id
       where n.source_id = s.id
         and (n.province is null or n.province = '');
    `);
    // === EK blok sonu ===

    console.log("3) URL üzerindeki UNIQUE kısıt/index'i kaldır (varsa)");
    try {
      await client.query(`alter table public.news drop constraint news_url_key`);
      console.log("   - constraint news_url_key kaldırıldı");
    } catch {
      console.log("   - constraint yok, geçiyorum");
    }
    await client.query(`drop index if exists news_url_key`);
    await client.query(`drop index if exists idx_news_url`);

    console.log("4) fingerprint indexlerini geçici kaldır (yeniden kuracağız)");
    await client.query(`drop index if exists news_fingerprint_key`);
    await client.query(`drop index if exists uniq_news_fingerprint`);

    console.log("5) fingerprint'i SADECE normalize(URL) ile doldur/yenile (regex YOK)");
    // canonical = lower(rtrim(split_part(split_part(url,'#',1),'?',1),'/'))
    await client.query(`
      update public.news
         set fingerprint = md5(
               lower(
                 rtrim(
                   split_part(
                     split_part(coalesce(url,''), '#', 1),
                     '?', 1
                   ),
                   '/'
                 )
               )
             )
       where coalesce(url,'') <> '';
    `);

    console.log("6) province → city_id eşle (opsiyonel, şimdilik geç)");
    // İleride gerekirse burada eşleme yapılacak

    console.log("7) source(name) → source_id eşle (opsiyonel, şimdilik geç)");
    // 2.6 zaten temel backfill'i yaptı; daha ileri kurallar eklenebilir.

    console.log("8) fingerprint çakışmalarını temizle (yenisini bırak)");
    await client.query(`
      delete from public.news a
      using public.news b
      where a.fingerprint = b.fingerprint
        and a.ctid <> b.ctid
        and (
          a.created_at < b.created_at
          or (a.created_at = b.created_at and a.ctid < b.ctid)
        );
    `);

    console.log("9) fingerprint'e UNIQUE index koy");
    await client.query(`
      create unique index if not exists news_fingerprint_key on public.news(fingerprint);
    `);

    console.log("✅ migration tamam");
  } catch (e) {
    console.error("❌ migration error:", e);
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌ migration fatal:", e);
  process.exit(1);
});
