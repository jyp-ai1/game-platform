-- Sprint 11-5: SEO platform — verification settings, lighthouse history, audit RPC.

create table if not exists public.seo_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.seo_settings (key, value) values
  ('google_verification', ''),
  ('bing_verification', ''),
  ('naver_verification', '')
on conflict (key) do nothing;

create table if not exists public.seo_lighthouse_runs (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  performance numeric(5, 2),
  accessibility numeric(5, 2),
  best_practices numeric(5, 2),
  seo numeric(5, 2),
  created_at timestamptz not null default now()
);

create index if not exists seo_lighthouse_runs_created_at_idx
  on public.seo_lighthouse_runs (created_at desc);

alter table public.seo_settings enable row level security;
alter table public.seo_lighthouse_runs enable row level security;

create policy "Public can read verification tokens"
  on public.seo_settings for select
  using (key in ('google_verification', 'bing_verification', 'naver_verification'));

-- SEO audit stats for admin dashboard (service role).
create or replace function public.get_seo_audit_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with indexable_games as (
    select *
    from public.games
    where status in ('ACTIVE', 'COMING_SOON')
  )
  select json_build_object(
    'sitemap_pages', (
      select 1
        + (select count(*) from indexable_games)
        + (select count(*) from public.categories)
    ),
    'indexable_games', (select count(*) from indexable_games),
    'indexable_categories', (select count(*) from public.categories),
    'meta_missing', (
      select count(*) from indexable_games
      where coalesce(trim(description), '') = ''
    ),
    'og_missing', (
      select count(*) from indexable_games
      where thumbnail_url is null
    ),
    'hidden_games', (
      select count(*) from public.games where status = 'HIDDEN'
    ),
    'maintenance_games', (
      select count(*) from public.games where status = 'MAINTENANCE'
    ),
    'verification', (
      select json_object_agg(key, value)
      from public.seo_settings
      where key in ('google_verification', 'bing_verification', 'naver_verification')
    ),
    'last_lighthouse', (
      select row_to_json(r)
      from (
        select url, performance, accessibility, best_practices, seo, created_at
        from public.seo_lighthouse_runs
        order by created_at desc
        limit 1
      ) r
    )
  );
$$;
