# GAME-DEV-001 — Snake Gameplay Improvement

**Status:** IMPLEMENTED (Preview QA pending deploy)

## Scope

| Feature | Implementation |
| --- | --- |
| Bonus food | `bonus` tier (score 8, +4 segments); spawns every ~20s near human L≥8; 30s TTL; pulsing gold visual + `BONUS!` popup |
| Progressive difficulty | Human speed +6%/min while alive, cap +25% (`progressiveSpeedMult` in `tickWorld`) |
| Game Over | Existing `MultiplayerDeathOverlay` — score + metric; wrapped with `data-testid="snake-game-over"` |
| Replay | `handleRetry` restarts in-place via `restartPlayerSnake` (removed lobby redirect on Retry) |

## Changed files

```
games/snake/src/snake-food-types.ts
games/snake/src/snake-feel-tuning.ts
games/snake/src/snake-io-engine.ts
games/snake/src/snake-world-canvas.ts
games/snake/src/SnakeIo.tsx
```

## Protected (not modified)

- Bomber MP Death Sync
- Platform SDK / apps/web (except snake game bundle import path unchanged)
- New QA Gate — none created

## Local verify

- `npm run typecheck` in `games/snake` — PASS

## Preview verify (PM / manual)

1. Home → Snake Quick Play → WORLD
2. Play until L≥8 — gold bonus gem appears nearby (~20s intervals)
3. Eat bonus — `BONUS!` popup + loot sound
4. Stay alive 2+ min — notice gentle speed increase (not abrupt)
5. Die — Game Over shows score + Retry
6. Retry — new snake spawns in same session (no lobby redirect)
7. Mobile pad — direction + boost still work after retry

## Commit / Preview

*(filled after push)*
