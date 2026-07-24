# Launch Event & Retention Policy

**Sprint:** 13 · Epic 2  
**Status:** Design only

---

## Retention Features (T5)

| Feature | Rule |
| --- | --- |
| **첫 플레이 XP 2배** | First `session_start` per slug · 7 days from `released_at` |
| **NEW 뱃지** | 7 days on card + detail |
| **이번주 신규게임** | Home section · current week launch slugs |
| **Weekly Pick** | CMS curated "이번 주 추천" slot |
| **오늘의 추천** | Daily featured single game (CMS or algorithm) |

---

## NEW Badge

| Rule | Value |
| --- | --- |
| Display | Game card + game detail hero |
| Duration | **7 days** from `released_at` |
| Label | `NEW` (uppercase pill) |
| Hide | Auto after day 7 (server date preferred) |
| Data | `games.released_at timestamptz` or CMS event `starts_at` |

### UI Wireframe

```
┌──────────────────┐
│ NEW              │
│  [thumbnail]     │
│  Pinball         │
└──────────────────┘
```

---

## Home — 「이번주 신규게임」

- Shows slugs with `released_at` within current ISO week OR active launch event  
- Max 4 cards horizontal scroll on mobile  
- Empty → section hidden  

```
🆕 이번주 신규게임
────────────────────
[ Pinball ] [ Connect4 ] [ Water Sort ] [ Mahjong ]
```

---

## Weekly Pick

- CMS slot: `featured_weekly` or banner type `weekly_pick`  
- One hero card on home — rotates each Monday  
- Links to game detail + optional mission boost  

---

## 오늘의 추천

- CMS slot: `featured_daily` or algorithm TOP unfinished game per device (future)  
- Sprint 13 MVP: **CMS manual** single card below hero  
- Resets daily at UTC midnight  

---

## First Play XP 2×

| Rule | Value |
| --- | --- |
| Trigger | First `session_start` per `device_id` + `game_slug` |
| Window | 7 days from game `released_at` |
| Effect | Mission/season XP × **2** for that session only |
| Dedupe | `localStorage` key `play29:first-play:{slug}` + analytics audit |
| Kill switch | Feature flag `launch_xp_boost` |

---

## CMS Launch Event Template

```
Title: Pinball 출시
Body: NEW Pinball — 첫 플레이 XP 2배 (7일)
Banner: /games/pinball
Featured slot: new_games
Event type: launch
```

---

## Analytics

- `launch_impression` — home new section view  
- `weekly_pick_click` — Weekly Pick CTR  
- `daily_pick_click` — 오늘의 추천 CTR  
- `first_play_boost` — XP boost applied  

---

## Epic 2 DoD (design)

- [ ] NEW badge spec approved  
- [ ] 이번주 신규게임 section approved  
- [ ] Weekly Pick + 오늘의 추천 wireframe approved  
- [ ] XP 2× policy approved  
- [ ] Mission hooks for launch slugs mapped  
