-- Sprint 11 T0/T1: Full analytics event types (PM spec).
-- Run after 0010. Safe to re-run.

alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in (
    'session_start',
    'game_start',
    'game_end',
    'game_pause',
    'game_resume',
    'game_over',
    'score_submit',
    'ranking_submit',
    'achievement_unlock',
    'mission_complete',
    'weekly_mission_complete',
    'daily_reward',
    'daily_reward_claim',
    'save_created',
    'resume',
    'favorite',
    'profile_open',
    'error',
    'share',
    'invite',
    'purchase',
    'ad_view'
  ));
