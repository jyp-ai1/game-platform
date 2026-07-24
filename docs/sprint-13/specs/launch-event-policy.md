# Launch Event Policy — NEW Badge & XP Boost

**Sprint:** 13 · Epic 5  
**Status:** Design only

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

## Home Section — 「이번주 신규게임」

- Shows all slugs with `released_at` within current ISO week OR active launch event  
- Max 4 cards horizontal scroll on mobile  
- Empty → section hidden  

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
- `launch_click` — card CTR  
- `first_play_boost` — XP boost applied  

---

## Epic 5 DoD (design)

- [ ] Badge component spec approved  
- [ ] Home section wireframe approved  
- [ ] XP policy approved  
- [ ] CMS event fields mapped  
