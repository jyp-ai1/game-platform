# Sprint 13 — Design Prep (Implementation FORBIDDEN)

**Status:** Planning only — **⏸️ HOLD until Sprint 12 GA (`v1.12.0`)**  
**PM:** 2026-07-24 — No code, no migrations, no game packages until kickoff

---

## Kick-off Blockers

```
QA PASS → DevOps PASS → PM PASS → v1.12.0 → sprint-13 branch → Kickoff
```

---

## PM Addition — Game Review Card

Each launched game requires D+7 review: [`specs/game-review-card.md`](./specs/game-review-card.md)

---

## Spec Index (design only)

| Epic | Document |
| --- | --- |
| 1 Pinball | [`specs/pinball.md`](./specs/pinball.md) |
| 2 Connect4 | [`specs/connect4.md`](./specs/connect4.md) |
| 3 Water Sort | [`specs/water-sort.md`](./specs/water-sort.md) |
| 4 Mahjong | [`specs/mahjong.md`](./specs/mahjong.md) |
| 5 Launch Event | [`specs/launch-event-policy.md`](./specs/launch-event-policy.md) |
| 6 Analytics | [`specs/game-analytics-kpi.md`](./specs/game-analytics-kpi.md) |
| Review | [`specs/game-review-card.md`](./specs/game-review-card.md) |

---

## 1. Game Package Designs (Review)

### Pinball

| Item | Design note |
| --- | --- |
| Core loop | Flippers · ball · score targets · 2–5 min session |
| Input | Left/right flipper (keyboard + touch zones) |
| Score | Point-based ranking |
| Save | Ball in play state optional; table state minimal |
| Category | `arcade` |
| Mission hooks | `session-start` play count · score threshold |

### Connect4

| Item | Design note |
| --- | --- |
| Core loop | 2-player vs AI · drop disc · win detect |
| Input | Column tap/click (1–7) |
| Score | Wins or move efficiency score for ranking |
| Save | Board state mid-game |
| Category | `board` |
| Mobile | Large touch columns |

### Water Sort

| Item | Design note |
| --- | --- |
| Core loop | Pour between tubes · sort colors |
| Input | Tap source + target tube |
| Score | Levels completed · moves |
| Save | Level + tube state |
| Category | `puzzle` |

### Mahjong

| Item | Design note |
| --- | --- |
| Scope | **Solitaire Mahjong** (tile match) — not 4-player |
| Core loop | Match pairs · clear board |
| Score | Time + remaining tiles |
| Save | Board layout |
| Category | `puzzle` |

---

## 2. NEW Badge UI

```
┌─────────────────┐
│ [NEW]  Pinball  │  ← badge top-left, 7 days from `released_at`
│  ★ thumbnail    │
└─────────────────┘
```

- Data: `games.released_at` or CMS event start date
- Hide after 7 days (server or client, prefer server `revalidate`)
- Game card + game detail hero

---

## 3. Home — 「이번주 신규게임」Section

```
🆕 이번주 신규게임
────────────────────
[ Pinball ] [ Connect4 ] [ Water Sort ] [ Mahjong ]
  NEW         NEW           NEW            NEW
```

- Position: after Hero · before category carousels (or after CMS notice)
- Source: CMS `featured` slot `new_games` or dedicated launch slugs array
- Empty state: hide section

---

## 4. 첫 플레이 XP 2× Policy

| Rule | Value |
| --- | --- |
| Trigger | First `session_start` per slug per device (localStorage or analytics dedupe) |
| Multiplier | 2× on mission/season XP earned **during that session** |
| Duration | 7 days from game `released_at` (global launch window) |
| Flag | Feature flag `launch_xp_boost` optional kill switch |
| Analytics | `first_play_boost` event in metadata |

---

## 5. Game Analytics 6 KPI (Final)

| KPI | Event / RPC |
| --- | --- |
| CTR | `game_card_click` → detail view |
| Play | `session_start` |
| Finish | `game_end` |
| Retry | 2+ `session_start` same slug/day |
| Avg Time | `game_end.metadata.duration_sec` |
| Ranking Rate | `ranking_submit / session_start` |

**Admin:** per-game row in `/admin/analytics` or game detail ops tab (Sprint 13 T5)

---

## 6. Game Package Checklist (Reference)

See [`game-selection-criteria.md`](./game-selection-criteria.md) — 13 items per launch.

---

## PM Sign-off (Design Prep)

Design prep complete when PM reviews this doc — **does not authorize implementation**.

**Implementation authorized only after:** Sprint 12 GA + kickoff meeting.
