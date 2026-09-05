-- Game Feedback & QA Operations Foundation
-- Extends game_comments with feedback type + ops status (MP-CTO-023 base: 0035)

alter table public.game_comments
  add column if not exists feedback_type text not null default 'opinion',
  add column if not exists status text not null default 'NEW';

alter table public.game_comments
  drop constraint if exists game_comments_feedback_type_check;

alter table public.game_comments
  add constraint game_comments_feedback_type_check
  check (feedback_type in ('opinion', 'bug', 'idea', 'fun', 'mobile'));

alter table public.game_comments
  drop constraint if exists game_comments_status_check;

alter table public.game_comments
  add constraint game_comments_status_check
  check (status in ('NEW', 'REVIEWING', 'PLANNED', 'IN_PROGRESS', 'QA', 'RELEASED'));

create index if not exists game_comments_day_slug_type_idx
  on public.game_comments (game_slug, feedback_type, created_at desc);
