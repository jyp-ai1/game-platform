# Sprint 15 — Developer Report & Certification

**Updated:** 2026-07-24 (Epic 1-B)  
**Branch:** `content-factory`  
**Preview:** https://game29-git-content-factory-jyp-ai1s-projects.vercel.app  
**Executor:** Developer (RC1 readiness — code scope only)

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Playable slugs | 50 | 50 |
| Save/Resume stack (8/8 SDK) | 39/50 | **50/50** |
| Ready countdown (3-2-1-GO) | 0/50 | **50/50** |
| Unified finish overlay | partial | **50/50** |
| Retry analytics | none | **50/50** |
| Hydration fixes (Epic1-B/C) | 1 known | **6 fixed** |
| Typecheck | PASS | PASS |
| Build | PASS | PASS |

---

## Certification matrix (50/50)

All slugs in `apps/web/lib/playable-games.ts`:

| # | Slug | Play | Finish | Score | Ranking | Save | Resume | Analytics | Ready GO | Finish UX |
|---|------|:----:|:------:|:-----:|:-------:|:----:|:------:|:---------:|:--------:|:---------:|
| 1 | 2048 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | snake | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 | breakout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | arkanoid-dx | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 | memory | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | minesweeper | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7 | samegame | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8 | maze-runner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9 | tank-battle | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 10 | galaxy-defender | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 11 | space-defender | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 12 | bubble-pop | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 13 | sudoku | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 14 | tic-tac-toe | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 15 | simon | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 16 | hangman | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 17 | color-match | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 18 | air-hockey | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 19 | tetris | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 20 | gold-miner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 21 | space-impact | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 22 | stack-tower | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 23 | ball-sort | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 24 | color-sort | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 25 | penalty-shootout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 26 | darts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 27 | bubble-shooter | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 28 | merge-blocks | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 29 | connect4 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 30 | reversi | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 31 | gomoku | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 32 | bowling | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 33 | archery | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 34 | sliding-puzzle | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 35 | whack-a-mole | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 36 | chess | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 37 | checkers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 38 | jigsaw | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 39 | mancala | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 40 | mini-golf | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 41 | billiards | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 42 | basketball | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 43 | table-tennis | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 44 | domino | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 45 | crossword | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 46 | chess960 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 47 | shuffleboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 48 | kakuro | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 49 | nonogram | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 50 | word-search | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Legend:** ✓ = verified in code (SDK wiring + build). Browser/mobile QA pending Independent QA pass.

---

## Shared infrastructure added

| Component | Location |
|-----------|----------|
| `ReadyCountdown` | `packages/ui/src/ready-countdown.tsx` |
| `useReadyCountdown` | `packages/game-sdk/src/use-ready-countdown.ts` |
| `emitGameRetry` | `packages/game-sdk/src/game-retry.ts` |
| Enhanced `GameOverOverlay` | Retry / Ranking / Next Game / score display |
| `#leaderboard` anchor | `apps/web/components/game-detail-template.tsx` |
| Retry → analytics bridge | `game-retry` → `game_start` + `{ retry: true }` |

---

## Release Package Audit (code + assets, 50/50)

Developer-scope minimum **8/8** per game (RC uses full 19/19 after QA):

| Item | Code/Asset check | Result |
|------|------------------|--------|
| Playable | `playable-games.ts` + `game-player.tsx` | **50/50** |
| Thumbnail | `apps/web/public/images/games/{slug}.png` | **50/50** |
| SEO | `generateMetadata` + JSON-LD on game pages | **PASS** (platform) |
| Ranking | `reportScore` → `game_end` + RPC submit | **50/50** |
| Save | `useAutoSave` | **50/50** |
| Resume | `useResumableGame` + `ResumeDialog` | **50/50** |
| Analytics (code) | see Analytics Instrumentation below | **50/50** |
| Category + CMS | SQL in migrations 0023–0025 (+ prior) | **READY** — Operator apply |
| Featured slot | `cms_featured_games` in 0023–0025 | **READY** — Operator apply |

**Operator dependency:** Epic4 games invisible until `0023`, `0024`, `0025` applied.

---

## Analytics Instrumentation Audit (code, 50/50)

| Event | Mechanism | Coverage |
|-------|-----------|----------|
| play | `RecentlyPlayedRecorder` → `game_start` | Platform (all game pages) |
| finish | `reportScore` → `game_end` | **50/50** games |
| retry | `emitGameRetry` on GameOverOverlay | **50/50** games |
| favorite | `favorite-button.tsx` → `favorite` | Platform |
| resume | `useResumableGame.onResume` → `resume` | **50/50** games |
| ranking | `submitScore` RPC → `ranking_submit` | Platform (nickname submit) |

**Epic1-B fix:** hangman now emits `game_end` on **lost** (score 0), not only on win.

**SQL validation:** HOLD — Operator runs templates in `analytics-validation.md` after QA traffic.

---

## Epic 1-B/C Hydration fixes

| Component | Issue | Fix |
|-----------|-------|-----|
| `header-level-badge.tsx` | XP localStorage vs SSR | `useMounted()` gate |
| `season-card.tsx` | Season XP count-up mismatch | `useMounted()` gate |
| `sound-toggle.tsx` | Icon mismatch when sound enabled | `useMounted()` gate |
| `profile-client.tsx` | Profile XP bar mismatch | `useMounted()` gate |
| `continue-playing-card.tsx` | Score/level/time read in SSR render | `useMounted()` gate |
| `player-stats.tsx` | Most-played bypasses SSR snapshot | `useSyncExternalStore` play counts |
| `use-mounted.ts` | Shared hook | Added |

**Local smoke (Epic 1-C):** Home + Profile load OK on `localhost:3010`. Game detail pages 404 locally without Supabase CMS rows (Operator migration dependency — expected).

---

## Gate status

| Gate | Status |
|------|--------|
| Developer Certification | **PASS** |
| Preview Deploy | **PASS** (`content-factory` @ `d1d1083` + Epic 1-C pending) |
| Independent QA (browser) | **HOLD** — Vercel Deployment Protection |
| Operator (migration 0023–0025) | **HOLD** |
| Console Error = 0 | **HOLD** — QA blocked |
| Network 500 = 0 | **HOLD** — QA blocked |

---

## Developer Report summary

- **Playable:** 50/50 registered in `playable-games.ts`
- **SDK 8/8:** 50/50 (save/resume/countdown/finish/retry analytics)
- **Build:** typecheck PASS, Vercel Preview build PASS (after `2cbdc6c` deps fix)
- **Commits:** `2036207` (Epic4 + Certification), `2cbdc6c` (Vercel deps)
- **Next:** Independent QA on Preview after Operator unblocks SSO + applies migrations
