# Sprint 13 — Analytics Validation Report

**Date:** 2026-07-24  
**Gate:** Analytics Validation (Exit Gate #5)  
**Scope:** 실제 DB 적재 확인 — SDK/코드 경로가 아닌 `analytics_events` 데이터

---

## Sample Games (5)

| # | Game | Slug | Type |
| --- | --- | --- | --- |
| 1 | 2048 | `2048` | Legacy |
| 2 | Connect4 | `connect4` | Sprint 13 new |
| 3 | Ball Sort | `ball-sort` | Sprint 13 new |
| 4 | Penalty Shootout | `penalty-shootout` | Sprint 13 new |
| 5 | Darts | `darts` | Sprint 13 new |

---

## Event Mapping (PM term → DB `event_type`)

| PM Check | DB `event_type` | Trigger |
| --- | --- | --- |
| Play | `session_start`, `game_start` | Game page load + play start |
| Finish | `game_end` | Game over via SDK |
| Ranking | `ranking_submit` | Score submit after game |
| Favorite | `favorite` | Favorite button on game detail |
| Retry | 2+ `game_start` same `device_id` | Replay / new round |

---

## Validation Procedure

### Step 1 — Manual Play (per game)

1. Open production game URL (incognito or test device)
2. Play 1 full round → game over → submit ranking if prompted
3. Toggle favorite once on game detail
4. Start a second round (Retry check)

### Step 2 — DB Query (Supabase SQL Editor)

Run after each sample game test (replace slug):

```sql
-- Last 24h events for one game
select
  event_type,
  count(*) as cnt,
  max(created_at) as latest
from public.analytics_events
where game_slug = '2048'  -- change slug
  and created_at >= now() - interval '24 hours'
group by event_type
order by cnt desc;
```

```sql
-- Retry proxy: devices with 2+ game_start (24h)
select device_id, count(*) as game_starts
from public.analytics_events
where game_slug = '2048'
  and event_type = 'game_start'
  and created_at >= now() - interval '24 hours'
group by device_id
having count(*) >= 2;
```

```sql
-- 5-game rollup (24h)
select
  game_slug,
  coalesce(sum(cnt) filter (where event_type in ('session_start', 'game_start')), 0) as play,
  coalesce(sum(cnt) filter (where event_type = 'game_end'), 0) as finish,
  coalesce(sum(cnt) filter (where event_type = 'ranking_submit'), 0) as ranking,
  coalesce(sum(cnt) filter (where event_type = 'favorite'), 0) as favorite,
  coalesce(sum(cnt) filter (where event_type = 'game_start'), 0) as game_starts
from (
  select game_slug, event_type, count(*) as cnt
  from public.analytics_events
  where game_slug in ('2048', 'connect4', 'ball-sort', 'penalty-shootout', 'darts')
    and created_at >= now() - interval '24 hours'
  group by game_slug, event_type
) e
group by game_slug
order by game_slug;
```

### Step 3 — Admin Cross-Check

| Admin path | Expected |
| --- | --- |
| `/admin/analytics` | Funnel counts move after test play |
| `/admin/analytics` → Sprint 13 KPI | connect4, ball-sort, penalty, darts rows update |
| `/admin/players/{deviceId}` | Recent events list shows types above |

---

## Results Matrix

| Game | Play | Finish | Ranking | Favorite | Retry | PASS |
| --- | --- | --- | --- | --- | --- | --- |
| 2048 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| connect4 | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| ball-sort | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| penalty-shootout | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| darts | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Pass criteria:** Each game shows ≥1 row for Play, Finish, Ranking after full test session. Favorite + Retry optional but recommended.

---

## Sign-off

| Role | Status | Date |
| --- | --- | --- |
| Analytics Validation | ☐ PASS · ☐ HOLD | |
| Operator (SQL run) | ☐ | |
| PM | ☐ RC1 pending | |
