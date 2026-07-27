# Game Standard — Sprint 13.6

All single-player games follow this platform contract.

## Lifecycle

```text
Game
├── Start      → createGameSession(slug)
├── Pause      → optional (capabilities.pause)
├── Resume
├── Retry      → session.recordGameRetry()
├── Exit       → emitGameExit + session.recordGameEnd()
├── Save       → useAutoSave (mid-run)
├── Stage      → session.recordStageClear()
├── Difficulty → per-game (see game-rules)
├── Result     → GameResultModal on Exit only
└── Progress   → game-progress (localStorage)
```

## Session API (games call only these)

```ts
import { createGameSession } from "@game-platform/game-sdk";

const session = createGameSession("bubble-pop");

// On stage clear
session.recordStageClear(stageIndex, score);

// On Retry tap
session.recordGameRetry();

// On Game Over / Exit
session.recordGameEnd({ score, stageReached, outcome: "failure" });
```

## Rule Taxonomy (docs/game-rules)

Every game rule doc **must** include:

| Section | Description |
|---------|-------------|
| **Difficulty** | How challenge scales |
| **Stage** | Stage ladder / goals |
| **GameOver** | Run ends (failure terminal) |
| **Clear** | Stage / level clear |
| **Victory** | Run win condition |
| **Failure** | Non-terminal or terminal fail |

## QA Batches

| Batch | Games |
|-------|-------|
| 1 | bubble-pop, 2048, memory, color-match |
| 2 | tetris, air-hockey, sudoku, minesweeper |
| 3 | remaining 1P games |

## Release Gate

```
Rule PASS → Stage PASS → Retry PASS → Save PASS → QA PASS → Preview → PM → Merge
```

## Admin

Game Health Dashboard: `/admin/game-health`
