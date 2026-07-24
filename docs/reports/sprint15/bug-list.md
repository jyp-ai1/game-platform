# Sprint 15 — Bug List (Epic 1)

**Updated:** 2026-07-24  
**Status:** Developer fixes applied; Independent QA verification pending

---

## P0 — Fixed

| ID | Game | Issue | Fix |
|----|------|-------|-----|
| P0-001 | 11 legacy games | No Save/Resume stack | Added `useResumableGame`, `useAutoSave`, `SaveIndicator`, `ResumeDialog` |
| P0-002 | maze-runner, tank-battle, galaxy-defender, space-defender, bubble-pop | `reportScore` fired on any non-playing state | Gated to terminal states only + `clearSave` |
| P0-003 | all 50 | No unified start countdown | `ReadyCountdown` + `useReadyCountdown` on all games |
| P0-004 | all 50 | Finish UX inconsistent | Enhanced `GameOverOverlay` (Complete / Retry / Ranking / Next Game) |
| P0-005 | all 50 | Retry not tracked in analytics | `emitGameRetry` → `game_start` with `retry: true` metadata |
| P0-006 | GameOverOverlay | TypeScript error (`asChild` unsupported) | Use `buttonVariants` on anchor for Next Game |

### P0 legacy games remediated

`sudoku`, `tic-tac-toe`, `simon`, `hangman`, `color-match`, `air-hockey`, `maze-runner`, `tank-battle`, `galaxy-defender`, `space-defender`, `bubble-pop`

---

## P1 — Fixed

| ID | Game | Issue | Fix |
|----|------|-------|-----|
| P1-001 | Finish overlay | Ranking button had no scroll target | Added `id="leaderboard"` on game detail page |

---

## P2 — Open (post-QA)

| ID | Area | Issue | Owner |
|----|------|-------|-------|
| P2-001 | Mobile | Per-game touch/canvas QA not yet executed | QA |
| P2-002 | Analytics | `analytics_events` SQL validation pending real traffic | Operator |
| P2-003 | Game feel | Particles/shake not added (MVP scope trimmed) | Sprint 16 |

---

## Counts

| Severity | Open | Fixed |
|----------|-----:|------:|
| P0 | 0 | 6 |
| P1 | 0 | 1 |
| P2 | 3 | 0 |
