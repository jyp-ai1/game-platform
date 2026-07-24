# Sprint 15 Epic 2 — RC1 Certification & Closed Beta Readiness

**Updated:** 2026-07-24 (Senior QA Report — Epic 2 RC1)  
**Branch:** `content-factory` @ `4d8f37f`  
**Preview:** https://game29-git-content-factory-jyp-ai1s-projects.vercel.app  
**Developer:** **HOLD** — P0/P1 bug fixes only from QA results  
**Product QA:** **HOLD** — Preview SSO blocks all official phases

---

### Developer Assessment

No code defects identified.

Developer remains HOLD pending Product QA execution.

Current blocker is operational (Preview Deployment Protection).

---

## Senior QA Report (2026-07-24)

| Task | Scope | Result | Notes |
|------|-------|--------|-------|
| **QA-1** | Preview Access | **FAIL** | Redirects to `vercel.com/login` (Deployment Protection) |
| **QA-2** | Phase 1 Functional (50 games) | **BLOCKED** | Requires Preview PASS |
| **QA-3** | Regression QA | **BLOCKED** | Requires Preview PASS |
| **QA-4** | Responsive QA | **BLOCKED** | Requires Preview PASS |
| **QA-5** | Accessibility QA | **BLOCKED** | Requires Preview PASS |
| **QA-6** | Lighthouse QA | **BLOCKED** | Requires Preview PASS |
| **QA-7** | Final Report | **DONE** | This document |

### Local smoke (non-official — RC1 gate invalid)

| Page | localhost:3010 | Console | Notes |
|------|----------------|---------|-------|
| Home `/` | PASS | not audited | Renders game carousel |
| Profile `/profile` | PASS | not audited | Stats, achievements |
| Game `/games/2048` | PASS | not audited | CMS meta loads; game chunk loading |
| Preview URL | **FAIL** | — | Vercel SSO login wall |

> **PM note:** Local smoke does **not** satisfy Product QA gate. Official RC1 certification requires Preview access.

### Phase summary (PM Release Gate)

| Phase | Status |
|-------|--------|
| Phase 1 Functional | **BLOCKED** |
| Phase 2 Analytics | **BLOCKED** |
| Phase 3 Operator/CMS | **BLOCKED** |
| Phase 4 RC1 Audit | **BLOCKED** |

### Known Issues (escalation)

| ID | Category | Issue | Owner |
|----|----------|-------|-------|
| OB-001 | Operational Blocker | Preview Deployment Protection (SSO) | **Operator** |

### PM Product QA verdict

**HOLD** — Product QA has not started. Developer remains **HOLD**.

---

## PM Gate matrix

| Gate | Status | Owner | Notes |
|------|--------|-------|-------|
| Developer | **PASS** | ✓ | Epic 1-A~D + P2-005 complete |
| Senior Developer | **PASS** | ✓ | Code certification complete |
| Senior QA | **BLOCKED** | QA | Operational — Preview SSO |
| DevOps | **WAIT** | DevOps | After Product QA PASS |
| Preview Deploy | **PASS** | ✓ | `content-factory` deployed |
| Code Quality | **PASS** | ✓ | Hydration, ESLint, Typecheck |
| Operator (Migration) | **PASS** | Operator | 0023, 0024, 0025 applied (PM 2026-07-24) |
| Independent QA | **BLOCKED** | QA | Preview SSO — **Product QA HOLD** |
| Analytics (live DB) | **HOLD** | Operator + QA | Phase 2 after QA traffic |
| Operator (CMS live) | **HOLD** | Operator | Phase 3 |
| PM Release | **HOLD** | PM | Product QA not started |
| main merge | **⛔ FORBIDDEN** | PM | |
| Production Promote | **⛔ FORBIDDEN** | PM | |

---

## Epic 2 path

```
Developer PASS ✓
    ↓
Independent QA PASS (Phase 1 — 50/50)
    ↓
Analytics PASS (Phase 2)
    ↓
Operator PASS (Phase 3)
    ↓
Release Candidate Audit (Phase 4)
    ↓
Bug Triage — Developer P0/P1 only (Phase 5)
    ↓
PM RC1 → release/sprint15-rc1
    ↓
Closed Beta (10–30 users)
```

---

## Phase 1 — Independent QA (4~5h)

**URL:** https://game29-git-content-factory-jyp-ai1s-projects.vercel.app

### Operator prerequisite (remaining)

- [ ] Vercel Deployment Protection 해제 **또는** QA Bypass Token 발급
- [x] Supabase Migration 0023, 0024, 0025 적용

### Per-game checklist (15 items)

| # | Check |
|---|-------|
| 1 | 게임 시작 |
| 2 | 정상 플레이 |
| 3 | 게임 종료 |
| 4 | 점수 계산 |
| 5 | Ranking 저장 |
| 6 | Save |
| 7 | Resume |
| 8 | Retry |
| 9 | Favorite |
| 10 | Refresh 후 Resume |
| 11 | Mobile 375px |
| 12 | Chrome |
| 13 | Edge |
| 14 | Console Error = 0 |
| 15 | Network 500 = 0 |

**Result per game:** `PASS` | `FAIL` | `BLOCKED`

### 50-game matrix (QA fill-in)

| # | Slug | Result | Tester | Notes |
|---|------|--------|--------|-------|
| 1 | 2048 | | | |
| 2 | snake | | | |
| 3 | breakout | | | |
| 4 | arkanoid-dx | | | |
| 5 | memory | | | |
| 6 | minesweeper | | | |
| 7 | samegame | | | |
| 8 | maze-runner | | | |
| 9 | tank-battle | | | |
| 10 | galaxy-defender | | | |
| 11 | space-defender | | | |
| 12 | bubble-pop | | | |
| 13 | sudoku | | | |
| 14 | tic-tac-toe | | | |
| 15 | simon | | | |
| 16 | hangman | | | |
| 17 | color-match | | | |
| 18 | air-hockey | | | |
| 19 | tetris | | | |
| 20 | gold-miner | | | |
| 21 | space-impact | | | |
| 22 | stack-tower | | | |
| 23 | ball-sort | | | |
| 24 | color-sort | | | |
| 25 | penalty-shootout | | | |
| 26 | darts | | | |
| 27 | bubble-shooter | | | |
| 28 | merge-blocks | | | |
| 29 | connect4 | | | |
| 30 | reversi | | | |
| 31 | gomoku | | | |
| 32 | bowling | | | |
| 33 | archery | | | |
| 34 | sliding-puzzle | | | |
| 35 | whack-a-mole | | | |
| 36 | chess | | | |
| 37 | checkers | | | |
| 38 | jigsaw | | | |
| 39 | mancala | | | |
| 40 | mini-golf | | | |
| 41 | billiards | | | |
| 42 | basketball | | | |
| 43 | table-tennis | | | |
| 44 | domino | | | |
| 45 | crossword | | | |
| 46 | chess960 | | | |
| 47 | shuffleboard | | | |
| 48 | kakuro | | | |
| 49 | nonogram | | | |
| 50 | word-search | | | |

**Regression priority (must PASS):** 2048, Snake, Tetris, Chess, Sudoku

**Phase 1 exit:** 50/50 PASS, Console Error = 0, Network 500 = 0

---

## Phase 2 — Analytics Certification (1~2h)

**Table:** `analytics_events`

| Event | Sample games | DB rows | Admin match |
|-------|--------------|---------|-------------|
| play (`game_start`) | all 15 new + 5 regression | | |
| finish (`game_end`) | | | |
| retry (`game_start` + retry) | | | |
| favorite | | | |
| ranking_submit | | | |
| resume | | | |

**New 15 (Sprint 14):** chess, checkers, jigsaw, mancala, mini-golf, billiards, basketball, table-tennis, domino, crossword, chess960, shuffleboard, kakuro, nonogram, word-search

**Regression 5:** 2048, snake, tetris, chess, sudoku

**Phase 2 exit:** 100% event coverage on sample set

---

## Phase 3 — Operator Certification (1h)

| CMS item | Modify | Reflect ≤5min |
|----------|--------|---------------|
| Banner | | |
| Notice | | |
| Featured | | |
| Weekly Pick | | |
| NEW Badge | | |
| Launch Event | | |

| Ops item | Verified |
|----------|----------|
| Maintenance mode | |
| Visibility (Hidden/Coming Soon) | |
| Category sort | |
| Featured slot | |
| Event slot | |

**Phase 3 exit:** Operator PASS

---

## Phase 4 — Release Candidate Audit (1h)

| Item | Status |
|------|--------|
| Playable 50/50 (code) | ✓ Developer |
| Playable 50/50 (QA) | pending |
| Migration 0023 | ✓ Operator |
| Migration 0024 | ✓ Operator |
| Migration 0025 | ✓ Operator |
| SEO / metadata | pending QA |
| Sitemap | pending QA |
| Analytics live | pending Phase 2 |
| Ranking RPC | pending QA |
| CMS live | pending Phase 3 |
| Featured / Search / Filter / Favorite / Continue | pending QA |

---

## Phase 5 — Bug Triage (Developer)

**Trigger:** QA FAIL results only

| Priority | Scope | SLA |
|----------|-------|-----|
| P0 | Crash, Freeze, Ranking/Save/Resume fail | Immediate fix + re-QA |
| P1 | UI, Hydration, Mobile, Difficulty, Analytics | Before RC1 |
| P2 | Polish | Sprint 16 / Closed Beta data |

Log bugs in `bug-list.md`. No refactoring outside fix scope.

---

## RC1 approval conditions

| # | Condition | Status |
|---|-----------|--------|
| 1 | Developer PASS | ✓ |
| 2 | QA PASS (50/50) | pending |
| 3 | Operator PASS | partial (migration ✓, CMS pending) |
| 4 | Analytics PASS | pending |
| 5 | P0 = 0 | pending |
| 6 | P1 = 0 | pending |
| 7 | Playable 50 | pending QA |
| 8 | Migration applied | ✓ |

**On all PASS:** create `release/sprint15-rc1` from `content-factory` → request PM RC1.

---

## Closed Beta readiness (post-RC1)

| KPI | Target |
|-----|--------|
| P0 bugs | 0 |
| P1 bugs | 0 |
| Finish Rate | ≥ 70% |
| Retry Rate | ≥ 40% |
| Favorite Rate | ≥ 15% |
| Ranking Submit | ≥ 30% |
| Avg play time | ≥ 5 min |
| Console Error | 0 |
| Network 500 | 0 |

---

## PM rules (Epic 2)

**Allowed:** QA bug fixes, analytics/operator verification, RC1 prep  
**Forbidden:** new games, new features, Sprint 16, main merge, Production promote, perf refactors
