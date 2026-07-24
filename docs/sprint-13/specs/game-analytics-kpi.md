# Game Analytics KPI — Definitions (Sprint 13)

**Status:** Design only — implementation after Sprint 12 GA  
**Focus:** **게임 중심** Analytics

Every **Game Package** (19 items) must emit or derive these events.

---

## Core Events

| Event | Definition | Trigger |
| --- | --- | --- |
| **Play** | Session started | `session_start` / `game_start` |
| **Finish** | Round completed | `game_end` / `game_over` |
| **Retry** | Same-day replay | ≥2 `session_start` same slug + device + day |
| **Quit** | Exit before finish | `game_quit` |
| **Resume** | Saved state loaded | `game_resume` |
| **Favorite** | Bookmark | `favorite_add` |
| **Mission** | Mission progress/completion | `mission_*` hooks |
| **Ranking** | Score submit | `ranking_submit` |
| Share | Social | **추후** |

---

## Operational KPI (Soft Launch + Game)

| KPI | Definition |
| --- | --- |
| **7일 Retention** | D7 / D0 cohort |
| **Replay Rate** | Retry % |
| **Average Session** | Avg session duration |

---

## Derived KPIs (Review Card · D+7)

| KPI | Calculation |
| --- | --- |
| **7일 생존율** | Slug players active on D7 / D0 cohort |
| **첫 플레이율** | First `session_start` / card impressions |
| **재플레이율** | Retry % |
| **즐겨찾기율** | Favorite / unique players |
| **Avg Score** | `game_end.metadata.score` avg |
| **Avg Time** | `game_end.metadata.duration_sec` avg |

---

## Funnel

```
Play → Finish → Retry
  ↘ Quit
  ↘ Resume (from Save)
  ↘ Favorite
```

---

## Admin Display (Sprint 13 T6)

Per-game: `/admin/analytics/games/[slug]`

| slug | Play | Finish | Quit | Resume | Retry% | Favorite% |

Period: today · week · month · since launch

**Review Card:** Admin에서 게임별 Card 표시 — [`../../game-review-card.md`](../../game-review-card.md)

---

## Draft Events (migration 0020)

```sql
'game_quit'      -- metadata: { slug, duration_sec, reason }
'game_resume'    -- metadata: { slug, save_age_sec }
'favorite_add'   -- metadata: { slug, source }
'game_end'       -- metadata: { score, duration_sec }
```

---

## PM Use

Feeds **Game Review Card** at D+7 · Portfolio Report quarterly.
