# Analytics Validation Matrix — 50 Games (Code)

**Generated:** 2026-07-24  
**Scope:** Static code scan · DB SQL validation = Operator  
**Result:** **50/50 PASS** · Overall: **PASS**

---

## Checks per game

| Check | Description |
|-------|-------------|
| reportScore | game_end on finish |
| useAutoSave | mid-game save |
| useResumableGame | resume dialog |
| useReadyCountdown | 3-2-1-GO |
| GameOverOverlay | unified finish UX |
| emitGameRetry | retry → analytics |

---

## Matrix

| # | Slug | Status | Missing |
|---|------|:------:|---------|
| 1 | 2048 | **PASS** | — |
| 2 | snake | **PASS** | — |
| 3 | breakout | **PASS** | — |
| 4 | arkanoid-dx | **PASS** | — |
| 5 | memory | **PASS** | — |
| 6 | minesweeper | **PASS** | — |
| 7 | samegame | **PASS** | — |
| 8 | maze-runner | **PASS** | — |
| 9 | tank-battle | **PASS** | — |
| 10 | galaxy-defender | **PASS** | — |
| 11 | space-defender | **PASS** | — |
| 12 | bubble-pop | **PASS** | — |
| 13 | sudoku | **PASS** | — |
| 14 | tic-tac-toe | **PASS** | — |
| 15 | simon | **PASS** | — |
| 16 | hangman | **PASS** | — |
| 17 | color-match | **PASS** | — |
| 18 | air-hockey | **PASS** | — |
| 19 | tetris | **PASS** | — |
| 20 | gold-miner | **PASS** | — |
| 21 | space-impact | **PASS** | — |
| 22 | stack-tower | **PASS** | — |
| 23 | ball-sort | **PASS** | — |
| 24 | color-sort | **PASS** | — |
| 25 | penalty-shootout | **PASS** | — |
| 26 | darts | **PASS** | — |
| 27 | bubble-shooter | **PASS** | — |
| 28 | merge-blocks | **PASS** | — |
| 29 | connect4 | **PASS** | — |
| 30 | reversi | **PASS** | — |
| 31 | gomoku | **PASS** | — |
| 32 | bowling | **PASS** | — |
| 33 | archery | **PASS** | — |
| 34 | sliding-puzzle | **PASS** | — |
| 35 | whack-a-mole | **PASS** | — |
| 36 | chess | **PASS** | — |
| 37 | checkers | **PASS** | — |
| 38 | jigsaw | **PASS** | — |
| 39 | mancala | **PASS** | — |
| 40 | mini-golf | **PASS** | — |
| 41 | billiards | **PASS** | — |
| 42 | basketball | **PASS** | — |
| 43 | table-tennis | **PASS** | — |
| 44 | domino | **PASS** | — |
| 45 | crossword | **PASS** | — |
| 46 | chess960 | **PASS** | — |
| 47 | shuffleboard | **PASS** | — |
| 48 | kakuro | **PASS** | — |
| 49 | nonogram | **PASS** | — |
| 50 | word-search | **PASS** | — |

---

## Operator SQL (live DB)

```sql
select game_slug, event_type, count(*) as cnt
from public.analytics_events
where created_at > now() - interval '7 days'
  and game_slug is not null
group by game_slug, event_type
order by game_slug, event_type;
```

See also [`analytics-validation.md`](./analytics-validation.md).
