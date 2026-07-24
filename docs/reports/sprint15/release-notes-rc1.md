# Release Notes — RC1 (Release Candidate 1)

**Status:** **GO (Developer RC1 Candidate)** — publish after PM Production sign-off  
**Branch:** `content-factory`  
**Target:** Sprint 15 Epic 2 certification  
**Date:** 2026-07-24

---

## Overview

Re:Play RC1 certifies **50 playable games**, unified **Save/Resume**, **Ready countdown**, **Game Over overlay**, **Retry analytics**, and **hydration fixes** for Sprint 15 production readiness.

> **Note:** This document is prepared ahead of PM GO. Do not publish until [`rc1-release-summary.md`](./rc1-release-summary.md) shows **GO**.

---

## Highlights

### Platform (Sprint 6–15)

- **50/50 playable games** with shared SDK stack (save, resume, ranking, analytics)
- **Player Hub** — profile, statistics, achievements, continue playing
- **Engagement** — XP, daily/weekly missions, season card
- **Operations** — `/admin` dashboard, CMS, analytics events
- **SEO** — metadata, JSON-LD, sitemap, robots, Open Graph

### Sprint 15 Quality (Epic 1)

- Hydration fixes (header XP, profile, continue playing, player stats)
- ESLint / Typecheck / Build **PASS**
- Unified finish UX + Ready GO countdown across all games
- Retry → analytics bridge (`emitGameRetry`)

---

## Game Catalog (50)

2048, snake, breakout, arkanoid-dx, memory, minesweeper, samegame, maze-runner, tank-battle, galaxy-defender, space-defender, bubble-pop, sudoku, tic-tac-toe, simon, hangman, color-match, air-hockey, tetris, gold-miner, space-impact, stack-tower, ball-sort, color-sort, penalty-shootout, darts, bubble-shooter, merge-blocks, connect4, reversi, gomoku, bowling, archery, sliding-puzzle, whack-a-mole, chess, checkers, jigsaw, mancala, mini-golf, billiards, basketball, table-tennis, domino, crossword, chess960, shuffleboard, kakuro, nonogram, word-search.

---

## Known Limitations (RC1)

See [`known-issues.md`](./known-issues.md):

- Preview QA blocked by OB-001 until Operator action
- P2 mobile polish and game feel deferred to Sprint 16

---

## Upgrade / Migration

- No DB schema changes in Epic 1-D scope
- Supabase migrations 0001–0017 apply as documented in HANDOFF

---

## Verification

| Check | Status |
|-------|--------|
| Build | PASS |
| Lint / Typecheck | PASS |
| Developer 50/50 cert | PASS |
| Product QA (Preview) | **PENDING** |

Full report: [`rc1-release-summary.md`](./rc1-release-summary.md)
