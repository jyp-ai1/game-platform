# Sprint 15 — Bug List (Epic 1 + 1-B)

**Updated:** 2026-07-24  
**Status:** Developer RC1-ready; Independent QA blocked (Preview SSO)

---

## P0 — Fixed

| ID | Scope | Issue | Fix |
|----|-------|-------|-----|
| P0-001 | 11 legacy games | No Save/Resume stack | Full SDK stack added |
| P0-002 | 5 arcade games | `reportScore` on wrong state | Terminal-state gate + `clearSave` |
| P0-003 | all 50 | No Ready countdown | `useReadyCountdown` + `ReadyCountdown` |
| P0-004 | all 50 | Inconsistent finish UX | Unified `GameOverOverlay` |
| P0-005 | all 50 | Retry not in analytics | `emitGameRetry` bridge |
| P0-006 | UI package | `asChild` TS error | `buttonVariants` anchor |

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

## P1 — Open (Operator)

| ID | Area | Issue | Owner |
|----|------|-------|-------|
| P1-003 | Preview QA | Vercel Deployment Protection (SSO) | **Operator** — unblock for Independent QA |

---

## P2 — Open

| ID | Area | Issue | Owner |
|----|------|-------|-------|
| P2-001 | Mobile | Touch/canvas per-game QA | QA (after unblock) |
| P2-002 | Analytics | Live `analytics_events` SQL | Operator |
| P2-003 | Game feel | Particles/shake polish | Sprint 16 |
| P2-004 | hangman | `game_end` missing on loss | **FIXED** — `reportScore(0)` on lost |

---

## P2 — Backlog (post-QA, data-driven)

| ID | Area | Notes |
|----|------|-------|
| P2-010 | Difficulty | Tune Bottom10 from Closed Beta KPI |
| P2-011 | Animation | Finish effects, score popup polish |
| P2-012 | Mobile UI | Spacing/touch targets from QA matrix |

---

## Counts

| Severity | Open | Fixed |
|----------|-----:|------:|
| P0 | 0 | 6 |
| P1 | 1 | 7 |
| P2 | 3 | 1 |

---

## RC1 readiness (Developer)

| Check | Status |
|-------|--------|
| P0 = 0 | **PASS** |
| P1 code issues = 0 | **PASS** |
| P1-003 Operator unblock | **OPEN** |
| 50/50 SDK wiring | **PASS** |
| Hydration (known) | **PASS** (code) |
| Independent QA | **BLOCKED** |
