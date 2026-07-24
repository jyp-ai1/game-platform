# Sprint 15 — Bug List (Epic 1 + 1-B/C/D + Epic 2 QA)

**Updated:** 2026-07-24 (Senior QA — Product QA HOLD)  
**Status:** Developer **HOLD** — no code defects; operational blocker only

---

## Operational Blockers (Release)

> Not code bugs. These block Product QA / Release gate.

| ID | Category | Issue | Owner | Developer Action | Release Impact |
|----|----------|-------|-------|------------------|----------------|
| OB-001 | Operational Blocker | Vercel Preview Deployment Protection (SSO) | **Operator** | **None** | Blocks Product QA execution |

**Next action:** Operator OP-1 (Preview SSO) → Senior QA Session 3 resumes at Phase A-1

---

## P0 — Fixed (Code)

| ID | Scope | Issue | Fix |
|----|-------|-------|-----|
| P0-001 | 11 legacy games | No Save/Resume stack | Full SDK stack added |
| P0-002 | 5 arcade games | `reportScore` on wrong state | Terminal-state gate + `clearSave` |
| P0-003 | all 50 | No Ready countdown | `useReadyCountdown` + `ReadyCountdown` |
| P0-004 | all 50 | Inconsistent finish UX | Unified `GameOverOverlay` |
| P0-005 | all 50 | Retry not in analytics | `emitGameRetry` bridge |
| P0-006 | UI package | `asChild` TS error | `buttonVariants` anchor |

**Code P0 open:** 0

---

## P1 — Fixed (Epic 1-B)

| ID | Area | Issue | Fix |
|----|------|-------|-----|
| P1-001 | Game detail | Ranking scroll target | `#leaderboard` anchor |
| P1-002 | Header | XP badge hydration mismatch | `useMounted()` in `header-level-badge` |
| P1-004 | Season card | Season XP hydration mismatch | `useMounted()` in `season-card` |
| P1-005 | Sound toggle | Icon hydration when sound on | `useMounted()` in `sound-toggle` |
| P1-006 | Profile | XP bar hydration mismatch | `useMounted()` in `profile-client` |
| P1-007 | Continue Playing | localStorage stats in SSR render | `useMounted()` in `continue-playing-card` |
| P1-008 | Player stats | `getMostPlayedGameSlug` bypasses SSR snapshot | `useSyncExternalStore` for play counts |

---

## P1 — Fixed (Epic 1-D)

| ID | Area | Issue | Fix |
|----|------|-------|-----|
| P1-009 | ESLint | `use-mounted` setState-in-effect | `useSyncExternalStore` pattern |
| P1-010 | ESLint | Admin realtime panel sync effect | Derive stats from prop |
| P1-011 | Lint hygiene | 3 unused imports in web app | Removed |

**Code P1 open:** 0 (awaiting Product QA findings)

---

## P2 — Open (post-QA)

| ID | Area | Issue | Owner |
|----|------|-------|-----|
| P2-001 | Mobile | Touch/canvas per-game QA | QA (after Preview unblock) |
| P2-002 | Analytics | Live `analytics_events` SQL | Operator |
| P2-003 | Game feel | Particles/shake polish | Sprint 16 |

---

## P2 — Fixed

| ID | Area | Issue | Fix |
|----|------|-------|-----|
| P2-004 | hangman | `game_end` missing on loss | `reportScore(0)` on lost |
| P2-005 | Games (37) | Unused `canPlay` destructure | Removed where only `canPlayRef` used |

---

## P2 — Backlog (post-RC1)

| ID | Area | Notes |
|----|------|-------|
| P2-010 | Difficulty | Tune Bottom10 from Closed Beta KPI |
| P2-011 | Animation | Finish effects, score popup polish |
| P2-012 | Mobile UI | Spacing/touch targets from QA matrix |

---

## QA-7 Classification Summary

| Class | Open | Fixed | Notes |
|-------|-----:|------:|-------|
| **Operational** | 1 | 0 | OB-001 — Preview SSO |
| **P0 (code)** | 0 | 6 | Developer PASS |
| **P1 (code)** | 0 | 10 | Await Product QA |
| **P2** | 3 | 2 | Sprint 16 / post-QA |

---

## RC1 readiness

| Check | Status |
|-------|--------|
| Code P0 = 0 | **PASS** |
| Code P1 = 0 | **PASS** (pre-QA) |
| Operational blockers | **OPEN** — OB-001 |
| 50/50 SDK wiring | **PASS** |
| ESLint / Build / Type | **PASS** |
| Product QA | **BLOCKED** — OB-001 |
| Developer | **HOLD** — no action until QA P0/P1 |
