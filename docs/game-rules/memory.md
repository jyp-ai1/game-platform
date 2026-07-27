# Memory — Game Rules

## 원작 (Concentration)

Flip pairs · match stay · mismatch flip back · all matched = win.

## Replay 적용

4×4 fixed · MAX_MOVES 50 auto-win (Batch 1 fix planned).

## Rule Taxonomy

| | |
|---|---|
| **Difficulty** | Grid size + pair count (planned per stage) |
| **Stage** | 2×2 → 6×6 ladder in game-stages.ts |
| **GameOver** | Move limit (planned — real loss) |
| **Clear** | All pairs matched |
| **Victory** | All pairs matched |
| **Failure** | Exceed move limit (planned) |

## 차이점

- Grid does not scale with stage yet
- 50-move cap = false victory (Batch 1 fix)
