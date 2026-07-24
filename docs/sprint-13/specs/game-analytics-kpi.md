# Game Analytics KPI — Definitions (Sprint 13 Epic 6)

**Status:** Design only — implementation after Sprint 12 GA

Every **Game Package** launch must emit or derive these six metrics.

---

## KPI Definitions

| KPI | Definition | Event / Calculation |
| --- | --- | --- |
| **CTR** | List/card click → game detail | `game_card_click` / impressions |
| **Play** | Session started | `session_start` or `game_start` |
| **Finish** | Round completed | `game_end` or `game_over` |
| **Retry** | Same-day replay | ≥2 `session_start` same slug + device + UTC day |
| **Avg Time** | Mean session duration | `game_end.metadata.duration_sec` avg |
| **Ranking Rate** | Rank submission rate | `ranking_submit` / `session_start` |

---

## Funnel

```
Impression → CTR → Play → Finish → Retry
                              ↘ Ranking Rate
```

---

## Admin Display (Sprint 13 T5)

Per-game row on `/admin/analytics/games/[slug]` or table:

| slug | CTR | Play | Finish | Retry% | Avg Time | Ranking% |
| --- | --- | --- | --- | --- | --- | --- |

Period tabs: today · week · month · since launch

---

## New Event Types (draft migration 0020)

```sql
-- Optional Sprint 13
'game_card_click'  -- metadata: { source: 'home'|'category'|'featured' }
'game_impression'  -- metadata: { source, position }
'first_play_boost'
```

Until migration: derive CTR from page views + session_start ratio (approximation).

---

## Data Quality Rules

- Exclude bot/test device_ids  
- Finish without Play = data bug → alert  
- Ranking Rate > 100% = invalid → cap audit  

---

## PM Use

Feeds **Game Review Card** at D+7 after each launch.
