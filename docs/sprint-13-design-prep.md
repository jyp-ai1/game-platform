# Sprint 13 — Design Prep (Implementation FORBIDDEN)

**Status:** Planning only — **⏸️ HOLD until Sprint 12 GA (`v1.12.0`)**  
**PM:** 2026-07-24 — No code, no migrations, no game packages until kickoff

---

## Kick-off Blockers

```
QA PASS → Rollback PASS → v1.12.0 Release → sprint-13 branch → Kickoff
```

**PM:** Sprint 12 구현 충분 — 더 개발하지 않음. Sprint 13 착수 전 Gate만 완료.

---

## PM Addition — Game Review Card

Each launched game requires D+7 review: [`specs/game-review-card.md`](./specs/game-review-card.md)

---

## Spec Index (design only)

| Epic | Document |
| --- | --- |
| 1 Game Package — Pinball | [`specs/pinball.md`](./specs/pinball.md) |
| 1 Game Package — Connect4 | [`specs/connect4.md`](./specs/connect4.md) |
| 1 Game Package — Water Sort | [`specs/water-sort.md`](./specs/water-sort.md) |
| 1 Game Package — Mahjong | [`specs/mahjong.md`](./specs/mahjong.md) |
| 2 Retention | [`specs/launch-event-policy.md`](./specs/launch-event-policy.md) |
| 3 Admin KPI | [`../pm-kpi-framework.md`](../pm-kpi-framework.md) |
| 4 Game Analytics | [`specs/game-analytics-kpi.md`](./specs/game-analytics-kpi.md) |
| 5 Game Quality | [`specs/game-quality-gate.md`](./specs/game-quality-gate.md) |
| Review | [`specs/game-review-card.md`](./specs/game-review-card.md) |
| Governance | [`../governance-v2-release-gate.md`](../governance-v2-release-gate.md) |
| Operator Manual | [`../operator-manual.md`](../operator-manual.md) |
| Package Template | [`../templates/game-package-template.md`](../templates/game-package-template.md) |

---

## Game Package (Epic 1)

Each game ships with full package:

```
Game · SEO · OG · Thumbnail · Leaderboard · Mission · XP · Season
Save · Category · NEW · Featured · Launch Event · Analytics · CMS · Admin
```

### Pinball

| Item | Design note |
| --- | --- |
| Core loop | Flippers · ball · score targets · 2–5 min session |
| Input | Left/right flipper (keyboard + touch zones) |
| Score | Point-based ranking |
| Save | Ball in play state optional; table state minimal |
| Category | `arcade` |

### Connect4 / Water Sort / Mahjong

See individual spec files.

---

## Retention (Epic 2 — T5)

- NEW badge 7 days  
- 이번주 신규게임 home section  
- Weekly Pick · 오늘의 추천  
- 첫 플레이 XP 2×  

---

## Game Analytics 6 KPI (Epic 4 — T6)

| KPI | Event |
| --- | --- |
| Play | session_start |
| Finish | game_end |
| Avg Score | game_end.metadata.score |
| Avg Time | game_end.metadata.duration_sec |
| Retry | 2+ session_start / day |
| Favorite | favorite_add |

---

## Game Quality Gate (Epic 5)

10/10 PASS before Production — see [`specs/game-quality-gate.md`](./specs/game-quality-gate.md)

---

## PM Sign-off (Design Prep)

Design prep complete when PM reviews this doc — **does not authorize implementation**.

**Implementation authorized only after:** Sprint 12 GA + kickoff meeting.
