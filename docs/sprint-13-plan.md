# Sprint 13 — Content Expansion MVP

**Status:** 🟡 Finalization (35 games ✅ · Release Package in progress)  
**Goal:** **21 → 35** playable · **launch-ready** games ✅ count  
**Platform:** Maintenance Only — finalization + `games/*` docs  
**Soft Launch:** Sprint 15 (after **50 launch-ready** games)

Exit gate: [`sprint-13-exit-gate.md`](./sprint-13-exit-gate.md) · Sprint 14: [`sprint-14-plan.md`](./sprint-14-plan.md) (**구현 금지**)

Full strategy: [`content-expansion-mvp.md`](./content-expansion-mvp.md)

---

## PM Final (2026-07-24)

> **50개를 채우는 것 ❌ · 50개의 출시 가능한 게임 ✅**

Platform MVP+ ✅ · Content 🔴

---

## Milestones

```
21 (now) → 35 (Sprint 13) → 50 (Sprint 14) → Soft Launch (Sprint 15) → Data Review (Sprint 16)
```

---

## Category Target (50 total)

| Category | Target |
| --- | ---: |
| Arcade | 12 |
| Puzzle | 12 |
| Board | 10 |
| Casual | 8 |
| Sports | 8 |
| **Total** | **50** |

---

## Epics (Sprint 13)

### Epic 1 — Tier C Batch #1 (7)

| # | Game | Slug (tbd) |
| --- | --- | --- |
| 1 | Stack | `stack-tower` |
| 2 | Ball Sort | `ball-sort` |
| 3 | Color Sort | `color-sort` |
| 4 | Penalty Shootout | `penalty-shootout` |
| 5 | Darts | `darts` |
| 6 | Bubble Shooter | `bubble-shooter` |
| 7 | Merge Blocks | `merge-blocks` |

### Epic 2 — Tier C Batch #2 (7)

TBD after Batch #1 — gap fill by category

### Epic 3 — Tier B (7)

Connect4 · Water Sort · Sudoku+ · Tic Tac Toe+ · Mines · Match3 · Sliding Puzzle

*(Sudoku, Tic Tac Toe, Minesweeper exist — upgrade or variant per PM)*

### Epic 4 — Tier A (3)

Pinball · Mahjong · Solitaire

### Epic 5 — Release Package (all new games)

Every game **19 items** — no compromise:

SEO · Metadata · OG · Category · Thumbnail · Rules · Difficulty · Missions · XP · Ranking · Favorite · Save/Resume · Analytics · Review Card · CMS Featured · Launch Event · QA PASS · Release Checklist · 운영 KPI

Template: [`templates/game-package-template.md`](./templates/game-package-template.md)

---

## Tier Guide

| Tier | Examples | Duration | Complexity |
| --- | --- | --- | --- |
| **A** | Pinball, Mahjong, Solitaire, 2048, Chess | ~1 week | High |
| **B** | Connect4, Water Sort, Snake, Memory | 2~3 days | Medium |
| **C** | Darts, Penalty, Stack, Color Sort, Merge | 1~2 days | Low |

**Package quality:** identical for all tiers.

---

## Governance (per batch)

```
Developer → QA → DevOps → Operator → PM → Production
```

---

## DoD (Sprint 13)

- [ ] Playable games **≥ 35**
- [ ] All new games: Release Package **19/19**
- [ ] `npm run typecheck` · `lint` · `build` PASS
- [ ] Platform regression: Console 0 · Network 500 0
- [ ] **No new platform features**

---

## Sprint Roadmap

| Sprint | Games | Focus |
| --- | --- | --- |
| **13** | 21 → **35** (+14) | Tier C×2 · Tier B start |
| **14** | 35 → **50** (+15) | Tier B finish · Tier A |
| **15** | Soft Launch | 3~7 days ops |
| **16** | Data Review | Tier A improve · formal launch |

---

## Cursor Mode

| ✅ Allow | ⛔ Block |
| --- | --- |
| `games/*` new packages | Admin/CMS/Analytics new features |
| Release Package per game | Soft Launch before 50 ready |
| Bug / hotfix | AI |

**Kickoff Epic 1:** PM sign-off or explicit **「Epic 1 시작」**
