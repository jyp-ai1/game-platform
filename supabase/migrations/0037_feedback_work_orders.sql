-- Feedback Intelligence & QA Prioritization — work orders + feedback links

create table if not exists public.feedback_work_orders (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  feedback_type text not null check (feedback_type in ('opinion', 'bug', 'idea', 'fun', 'mobile')),
  priority text not null default 'P2' check (priority in ('P0', 'P1', 'P2', 'P3')),
  status text not null default 'NEW' check (
    status in ('NEW', 'REVIEWING', 'PLANNED', 'IN_PROGRESS', 'QA', 'RELEASED')
  ),
  problem text not null,
  acceptance_criteria text,
  evidence_count int not null default 0,
  evidence_feedback_ids uuid[] not null default '{}',
  sample_content text,
  pattern_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_work_orders_slug_status_idx
  on public.feedback_work_orders (game_slug, status, created_at desc);

alter table public.game_comments
  add column if not exists work_order_id uuid references public.feedback_work_orders (id) on delete set null,
  add column if not exists release_version text;

create index if not exists game_comments_work_order_idx
  on public.game_comments (work_order_id)
  where work_order_id is not null;
