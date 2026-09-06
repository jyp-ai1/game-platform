-- Feedback provenance — separate REAL_PLAYER from QA/AUTOMATION (minimal, non-destructive)
-- Does not delete QA rows; backfills existing automation data.

alter table public.game_comments
  add column if not exists feedback_provenance text not null default 'REAL_PLAYER';

alter table public.game_comments
  drop constraint if exists game_comments_feedback_provenance_check;

alter table public.game_comments
  add constraint game_comments_feedback_provenance_check
  check (feedback_provenance in ('REAL_PLAYER', 'QA_AUTOMATION'));

create index if not exists game_comments_provenance_slug_idx
  on public.game_comments (feedback_provenance, game_slug, created_at desc);

-- Backfill existing QA/automation rows (author + content markers)
update public.game_comments
set feedback_provenance = 'QA_AUTOMATION'
where feedback_provenance = 'REAL_PLAYER'
  and (
    author ilike 'QA-%'
    or author ilike 'QA\_%'
    or content ilike '%wo-qa-%'
    or content ilike '%wo-e2e-%'
    or content ilike '%m37-qa%'
    or content ilike '%m36-verify%'
    or content ilike '%fbops-%'
    or content ilike '%fi-qa%'
    or content ilike '%sync002fix-%'
    or content ilike '%sync002-%'
  );
