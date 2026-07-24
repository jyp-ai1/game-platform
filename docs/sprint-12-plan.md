# Sprint 12 — Operation Platform 1.0 (Preparation)

**Status:** DRAFT — start **after** Sprint 11 PM PASS + `v1.11.0` tag  
**Governance:** v2.0 (QA → DevOps → AI → PM)

## Goal

운영자가 게임 플랫폼을 **실시간으로 운영·관리**할 수 있는 수준으로 고도화.

## Epics

| # | Epic | Route / Scope |
| --- | --- | --- |
| 1 | Player Management | `/admin/players` — list, search, timeline, detail |
| 2 | Game Operation Dashboard | `/admin/games` — DAU, retention, save ratio per game |
| 3 | Feature Flag | Leaderboard, Season, CMS, Beta — runtime toggle |
| 4 | Error Dashboard | 404/500/hydration/API/build/deploy |
| 5 | CMS Upgrade | DnD, inline edit, upload, preview, pin |
| 6 | Analytics Upgrade | Funnel, cohort, bounce, hourly/weekly |
| 7 | Monitoring | Health, storage, API, DB, cron, deploy |
| 8 | Revenue Ready | Ad slots, feature flags (Sprint 13 integration) |

## Migrations (planned)

- `0018_feature_flags.sql`
- `0019_admin_players_rpcs.sql`
- `0020_error_events.sql`

## DoD

Same as Governance v2.0 — all gates PASS, release note, rollback verified.

## Dependencies

- Sprint 11 PASS
- `v1.11.0` GitHub Release
- QA test plan extended for Sprint 12
