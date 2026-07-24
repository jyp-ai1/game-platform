# Sprint 15 — Analytics Validation

**Date:** 2026-07-24  
**Status:** Developer wiring verified — **Operator SQL validation HOLD**

---

## Event coverage (50/50 games)

| Event | Source | Games |
|-------|--------|-------|
| `session_start` | `RecentlyPlayedRecorder` on game page load | All |
| `game_start` | `RecentlyPlayedRecorder` on game page load | All |
| `game_end` | `reportScore()` → `AnalyticsBridge` | All 50 on finish |
| `save_created` | `saveGame()` → platform analytics | All 50 (in-progress saves) |
| `resume` | `useResumableGame.onResume()` | All 50 |
| `game_start` (retry) | `emitGameRetry()` on Retry button | All 50 |
| `ranking_submit` | `game-player.tsx` submitScore RPC | On nickname submit |
| `favorite` | `favorite-button.tsx` toggle | Platform-wide |

---

## Bridge mapping (`apps/web/components/analytics-bridge.tsx`)

```
game-end      → game_end
save-created  → save_created
save-resumed  → resume
game-retry    → game_start { retry: true }
```

---

## SQL templates (Operator)

### Per-game event counts (last 7 days)

```sql
select
  game_slug,
  event_type,
  count(*) as cnt
from public.analytics_events
where created_at > now() - interval '7 days'
  and game_slug is not null
group by game_slug, event_type
order by game_slug, event_type;
```

### Certification check — games missing game_end

```sql
select g.slug
from public.games g
where g.status = 'ACTIVE'
  and g.slug in (/* 50 playable slugs */)
  and not exists (
    select 1 from public.analytics_events ae
    where ae.game_slug = g.slug
      and ae.event_type = 'game_end'
      and ae.created_at > now() - interval '7 days'
  );
```

### Retry rate proxy

```sql
select
  game_slug,
  count(*) filter (where metadata->>'retry' = 'true') as retries,
  count(*) filter (where event_type = 'game_start') as starts
from public.analytics_events
where event_type = 'game_start'
  and created_at > now() - interval '7 days'
group by game_slug;
```

---

## Result

| Check | Developer | Operator |
|-------|-----------|----------|
| Wiring complete | **PASS** | — |
| Live `analytics_events` data | — | **HOLD** |
| Analytics Gate | — | **HOLD** |
