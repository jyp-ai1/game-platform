-- Sprint 11 T0: Expand analytics_events event types per PM spec.
-- Run after 0010. Safe to re-run.

alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in (
    'session_start',
    'game_start',
    'game_end',
    'game_over',
    'score_submit',
    'achievement_unlock',
    'mission_complete',
    'daily_reward_claim',
    'save_created',
    'resume',
    'error',
    'share'
  ));
