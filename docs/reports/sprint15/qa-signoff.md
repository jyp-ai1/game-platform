# Sprint 15 Epic 2 — RC1 Master QA Plan

**Updated:** 2026-07-24 (Master Plan — Session 2)  
**Branch:** `content-factory` @ `242d416`  
**Preview:** https://game29-git-content-factory-jyp-ai1s-projects.vercel.app  
**Developer:** **HOLD** — P0/P1 code defects only  
**Senior QA:** **BLOCKED** at Phase A-1 (Operational)

---

### Developer Assessment

No code defects identified.

Developer remains HOLD pending Product QA execution.

Current blocker is operational (Preview Deployment Protection).

---

## Release path

```
Epic 2 RC1
    ↓ Product QA PASS (Phases A–F)
    ↓ DevOps PASS (Phase H)
    ↓ PM Release Approval (Phase I)
    ↓ RC1 Closed → release/sprint15-rc1
```

---

## Master Plan — Phase Status

| Phase | Name | Official Status | Notes |
|-------|------|-----------------|-------|
| **A** | Preview Environment | **BLOCKED** | A-1 FAIL — SSO |
| **B** | Functional Certification | **BLOCKED** | Requires Preview |
| **C** | Regression Certification | **BLOCKED** | Requires Preview |
| **D** | Responsive Certification | **BLOCKED** | Requires Preview |
| **E** | Accessibility Certification | **BLOCKED** | Requires Preview |
| **F** | Performance Certification | **BLOCKED** | Requires Preview |
| **G** | Release Candidate Audit | **IN PROGRESS** | Docs only |
| **H** | DevOps Verification | **WAIT** | After Product QA |
| **I** | PM Release Review | **HOLD** | After all PASS |

> **Local prep (non-official):** Phase A-3 route smoke on `localhost:3010` — 15/15 routes + 50/50 game pages HTTP 200. Does **not** satisfy RC1 gate.

---

## PM Gate matrix

| Gate | Status | Owner |
|------|--------|-------|
| Developer | **PASS** | ✓ |
| Senior Developer | **PASS** | ✓ |
| Senior QA | **BLOCKED** | Operational — OB-001 |
| DevOps | **WAIT** | After Product QA |
| PM Release | **HOLD** | PM |
| main merge / Production | **⛔ FORBIDDEN** | PM |

---

## Execution Log

| Date | Session | Action | Result |
|------|---------|--------|--------|
| 2026-07-24 | 1 | QA-1 Preview access | **FAIL** — Vercel SSO |
| 2026-07-24 | 1 | Local smoke (home, profile, 2048) | PASS (non-official) |
| 2026-07-24 | 1 | Docs: qa-signoff + bug-list OB-001 | Committed `242d416` |
| 2026-07-24 | 2 | Master Plan structure | This document |
| 2026-07-24 | 2 | A-3 localhost route smoke | 15 routes 200, 50 games 200 |
| 2026-07-24 | 2 | A-1 Preview re-check | **FAIL** — still SSO |

**Next session (after OP-1):** A-1 PASS → A-2 → A-3 on Preview → Phase B start

---

# Phase A — Preview Environment Certification

## A-1 Preview Access

| Check | Result | Evidence |
|-------|--------|----------|
| Preview URL loads | **FAIL** | Redirect to `vercel.com/login` |
| No login redirect | **FAIL** | Deployment Protection active |
| QA Bypass Token | **N/A** | Not issued |

**Owner:** Operator (OB-001)  
**Gate:** Preview **FAIL** — blocks Phases B–F

---

## A-2 Environment Verification

| Check | Preview | Localhost (prep) |
|-------|---------|------------------|
| Env vars / build | BLOCKED | PASS (build OK) |
| CMS games in DB | BLOCKED | PASS (50 game pages 200) |
| Analytics API | BLOCKED | not tested |
| OAuth (public) | N/A | N/A — device_id only |
| API / RPC | BLOCKED | partial (pages load) |
| Assets / thumbnails | BLOCKED | PASS (images referenced) |
| Fonts / Image loader | BLOCKED | not audited |

**Official:** BLOCKED until A-1 PASS

---

## A-3 Smoke Test (Routing)

### Platform routes

| Route | Preview | Localhost | Notes |
|-------|---------|-----------|-------|
| `/` | BLOCKED | **200** | |
| `/games` | BLOCKED | **200** | |
| `/games/[slug]` (50) | BLOCKED | **200 ×50** | All slugs |
| `/leaderboard` | N/A | N/A | Embedded in `/games/[slug]` |
| `/profile` | BLOCKED | **200** | |
| `/favorites` | BLOCKED | **200** | |
| `/privacy` | BLOCKED | **200** | |
| `/terms` | BLOCKED | **200** | |
| `/about` | BLOCKED | **200** | |
| `/contact` | BLOCKED | **200** | |
| `/search` | BLOCKED | **200** | |
| `/categories/puzzle` | BLOCKED | **200** | |
| `/sitemap.xml` | BLOCKED | **200** | |
| `/robots.txt` | BLOCKED | **200** | |
| `/manifest.webmanifest` | BLOCKED | **200** | |

Console / Hydration / Network 500: **pending** (browser audit on Preview)

---

# Phase B — Functional Certification

**Status:** BLOCKED (Preview)

## B-1 — 50 Game Certification

Per game: Open · Loading · Input · Pause · Retry · Game Over · Score · Ranking · Exit · Save · Resume

| # | Slug | Result | Tester | Notes |
|---|------|--------|--------|-------|
| 1 | 2048 | BLOCKED | | |
| 2 | snake | BLOCKED | | |
| 3 | breakout | BLOCKED | | |
| 4 | arkanoid-dx | BLOCKED | | |
| 5 | memory | BLOCKED | | |
| 6 | minesweeper | BLOCKED | | |
| 7 | samegame | BLOCKED | | |
| 8 | maze-runner | BLOCKED | | |
| 9 | tank-battle | BLOCKED | | |
| 10 | galaxy-defender | BLOCKED | | |
| 11 | space-defender | BLOCKED | | |
| 12 | bubble-pop | BLOCKED | | |
| 13 | sudoku | BLOCKED | | |
| 14 | tic-tac-toe | BLOCKED | | |
| 15 | simon | BLOCKED | | |
| 16 | hangman | BLOCKED | | |
| 17 | color-match | BLOCKED | | |
| 18 | air-hockey | BLOCKED | | |
| 19 | tetris | BLOCKED | | |
| 20 | gold-miner | BLOCKED | | |
| 21 | space-impact | BLOCKED | | |
| 22 | stack-tower | BLOCKED | | |
| 23 | ball-sort | BLOCKED | | |
| 24 | color-sort | BLOCKED | | |
| 25 | penalty-shootout | BLOCKED | | |
| 26 | darts | BLOCKED | | |
| 27 | bubble-shooter | BLOCKED | | |
| 28 | merge-blocks | BLOCKED | | |
| 29 | connect4 | BLOCKED | | |
| 30 | reversi | BLOCKED | | |
| 31 | gomoku | BLOCKED | | |
| 32 | bowling | BLOCKED | | |
| 33 | archery | BLOCKED | | |
| 34 | sliding-puzzle | BLOCKED | | |
| 35 | whack-a-mole | BLOCKED | | |
| 36 | chess | BLOCKED | | |
| 37 | checkers | BLOCKED | | |
| 38 | jigsaw | BLOCKED | | |
| 39 | mancala | BLOCKED | | |
| 40 | mini-golf | BLOCKED | | |
| 41 | billiards | BLOCKED | | |
| 42 | basketball | BLOCKED | | |
| 43 | table-tennis | BLOCKED | | |
| 44 | domino | BLOCKED | | |
| 45 | crossword | BLOCKED | | |
| 46 | chess960 | BLOCKED | | |
| 47 | shuffleboard | BLOCKED | | |
| 48 | kakuro | BLOCKED | | |
| 49 | nonogram | BLOCKED | | |
| 50 | word-search | BLOCKED | | |

**Regression priority:** 2048, snake, tetris, chess, sudoku

## B-2 — Leaderboard

Submit · Nickname · Duplicate · Sorting · Best Score · Pagination · Update — **BLOCKED**

## B-3 — Player Hub

Profile · Statistics · Achievements · Continue · Favorites · Header XP · Mission · Resume — **BLOCKED**

## B-4 — CMS (game pages)

Meta · OG · Description · Tags · Category · Thumbnail · Related Games — **BLOCKED**

## B-5 — Search

Search · Filter · Category · Tag · No Result · Performance — **BLOCKED**

---

# Phase C — Regression Certification

**Status:** BLOCKED (Preview)

> Re:Play scope mapping (consulting-platform items → platform equivalent)

| Area | Re:Play scope | Status |
|------|---------------|--------|
| OAuth (Google/GitHub) | **N/A** — no public OAuth | N/A |
| Admin Dashboard | `/admin` | BLOCKED |
| Landing | `/` | BLOCKED |
| Analytics | `/admin/analytics` | BLOCKED |
| CMS | `/admin/cms` | BLOCKED |
| Content Factory | `tools/content-factory` | code only |
| Export | `/admin/reports/export` | BLOCKED |
| Memory (game) | `/games/memory` | BLOCKED |
| Language | `lang=ko` fixed | BLOCKED |
| Theme | system + sound toggle | BLOCKED |
| Sprint 6–15 Player Hub | profile, missions, save | BLOCKED |

---

# Phase D — Responsive Certification

**Status:** BLOCKED

Viewports: 390 · 430 · 768 · 1024 · 1440 · 1920  
Pages: Home · Game Detail · Profile · Favorites · Search

---

# Phase E — Accessibility Certification

**Status:** BLOCKED

Keyboard · Focus · ARIA · Contrast · Reduced Motion · Lighthouse A11y 100

---

# Phase F — Performance Certification

**Status:** BLOCKED

Lighthouse: `/` · `/games` · `/profile` · representative game  
Targets: Perf ≥90 · A11y 100 · BP 100 · SEO 100 · CLS/LCP/INP

---

# Phase G — Release Candidate Audit

**Status:** IN PROGRESS (documentation)

| Doc | Exists | Current |
|-----|--------|---------|
| `qa-signoff.md` | ✓ | This file |
| `bug-list.md` | ✓ | OB-001 open |
| `game-certification.md` | ✓ | Developer 50/50 |
| `release-note.md` | ✗ | Post-RC1 |
| `known-issues.md` | ✗ | Use bug-list |
| `deployment.md` | ✗ | Post-RC1 |

Bug classes: P0 · P1 · P2 · Operational — see `bug-list.md`

---

# Phase H — DevOps Verification

**Status:** WAIT

Branch `content-factory` @ `242d416` · Preview deploy OK · Production **not promoted**

---

# Phase I — PM Release Review

**Status:** HOLD

Checklist: Developer ✓ · Senior QA ✗ · Regression ✗ · Responsive ✗ · A11y ✗ · Perf ✗ · DevOps ✗ · P0 code=0 ✓ · P1 code=0 ✓ · Operational open

---

# Release approval conditions

- [ ] Preview Access (A-1 PASS)
- [ ] Functional QA (Phase B)
- [ ] Regression QA (Phase C)
- [ ] Responsive QA (Phase D)
- [ ] Accessibility QA (Phase E)
- [ ] Lighthouse QA (Phase F)
- [ ] DevOps QA (Phase H)
- [ ] Production Smoke
- [ ] P0 = 0 (code)
- [ ] P1 = 0 (code)
- [ ] QA Signoff Complete

**Operational:** OB-001 must close before Product QA counts as started.

---

# PM rules

**Allowed:** QA execution, bug documentation, P0/P1 fixes from QA  
**Forbidden:** new features, new games, refactoring, main merge, Production promote
