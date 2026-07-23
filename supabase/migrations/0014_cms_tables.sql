-- Sprint 11 T4: CMS Platform tables + audit log + MAINTENANCE game status.

alter table public.games drop constraint if exists games_status_check;
alter table public.games
  add constraint games_status_check
  check (status in ('ACTIVE', 'COMING_SOON', 'HIDDEN', 'MAINTENANCE'));

-- ---------------------------------------------------------------------------
-- cms_banners
-- ---------------------------------------------------------------------------
create table if not exists public.cms_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text,
  button_text text,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- cms_notices
-- ---------------------------------------------------------------------------
create table if not exists public.cms_notices (
  id uuid primary key default gen_random_uuid(),
  notice_type text not null default 'normal'
    check (notice_type in ('normal', 'urgent', 'maintenance', 'update', 'event')),
  title text not null,
  body text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- cms_events
-- ---------------------------------------------------------------------------
create table if not exists public.cms_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  game_slug text references public.games(slug) on delete set null,
  banner_id uuid references public.cms_banners(id) on delete set null,
  reward_text text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '7 days'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- cms_featured_games
-- ---------------------------------------------------------------------------
create table if not exists public.cms_featured_games (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in (
    'weekly_pick', 'editors_pick', 'trending', 'new_games', 'popular'
  )),
  game_slug text not null references public.games(slug) on delete cascade,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (slot, game_slug)
);

-- ---------------------------------------------------------------------------
-- cms_game_visibility (syncs to games.status)
-- ---------------------------------------------------------------------------
create table if not exists public.cms_game_visibility (
  game_slug text primary key references public.games(slug) on delete cascade,
  visibility text not null check (visibility in (
    'visible', 'hidden', 'coming_soon', 'maintenance'
  )),
  note text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- cms_audit_log
-- ---------------------------------------------------------------------------
create table if not exists public.cms_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'admin',
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists cms_audit_log_created_at_idx
  on public.cms_audit_log (created_at desc);

-- RLS: public read active banners/notices in date range; writes via service role only.
alter table public.cms_banners enable row level security;
alter table public.cms_notices enable row level security;
alter table public.cms_events enable row level security;
alter table public.cms_featured_games enable row level security;
alter table public.cms_game_visibility enable row level security;
alter table public.cms_audit_log enable row level security;

create policy "Public can read active banners"
  on public.cms_banners for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "Public can read active notices"
  on public.cms_notices for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "Public can read active events"
  on public.cms_events for select
  using (
    is_active
    and starts_at <= now()
    and ends_at >= now()
  );

create policy "Public can read active featured games"
  on public.cms_featured_games for select
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

-- Sync cms_game_visibility → games.status
create or replace function public.sync_cms_game_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.games
  set
    status = case new.visibility
      when 'visible' then 'ACTIVE'
      when 'hidden' then 'HIDDEN'
      when 'coming_soon' then 'COMING_SOON'
      when 'maintenance' then 'MAINTENANCE'
    end,
    updated_at = now()
  where slug = new.game_slug;
  return new;
end;
$$;

drop trigger if exists cms_game_visibility_sync on public.cms_game_visibility;
create trigger cms_game_visibility_sync
  after insert or update on public.cms_game_visibility
  for each row execute function public.sync_cms_game_visibility();

-- Seed visibility rows from current games
insert into public.cms_game_visibility (game_slug, visibility)
select
  slug,
  case status
    when 'ACTIVE' then 'visible'
    when 'HIDDEN' then 'hidden'
    when 'MAINTENANCE' then 'maintenance'
    else 'coming_soon'
  end
from public.games
on conflict (game_slug) do nothing;

-- CMS overview stats for admin dashboard
create or replace function public.get_cms_overview_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'banners_active', (select count(*) from public.cms_banners where is_active),
    'notices_active', (select count(*) from public.cms_notices where is_active),
    'events_active', (select count(*) from public.cms_events where is_active and ends_at >= now()),
    'featured_active', (select count(*) from public.cms_featured_games where is_active),
    'expiring_soon', (
      select count(*) from (
        select id from public.cms_banners where is_active and ends_at between now() and now() + interval '7 days'
        union all
        select id from public.cms_notices where is_active and ends_at between now() and now() + interval '7 days'
        union all
        select id from public.cms_events where is_active and ends_at between now() and now() + interval '7 days'
      ) x
    )
  );
$$;
