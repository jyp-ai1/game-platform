# GAME-DEV-003 — Bomber Gameplay Improvement (Single-player)

**Status:** IMPLEMENTED (Preview QA pending deploy)

## Scope

| Feature | Implementation |
| --- | --- |
| Bomb plant feedback | Gold flash on new bomb + engine `feedback.kind=plant` |
| Danger warning | `getBombDangerCells` — dashed red overlay last ~45% of fuse |
| Blast VFX | Gradient blast cells + `💥` popup |
| Block destroy | Soft block break → `+5` score popup |
| Reward (1 kind) | Coin 🪙 (~22% from soft blocks) → `+10` score on pickup |
| Score / progress | HUD `SCORE` + popups for block/coin/kill |
| Game Over / Retry | Solo: death overlay when local dies; Retry → `restartSoloMatch` in-place |

## Changed files

```
games/bomber/src/bomber-engine.ts
games/bomber/src/Bomber.tsx
```

## NOT modified

- Bomber MP Death Sync paths (`isHostRef`, `matchHostIdRef`, `reconcileHumans` death rules)
- Snake, Agar, platform SDK, Game Registration, Comments
- MobileControlPad reimplementation
- New QA Gate

## Local verify

- `npm run typecheck` in `games/bomber` — PASS

## Preview verify (PM / manual — solo)

1. Map select → solo match (no other humans in room)
2. Plant bomb — gold flash; near detonation — red danger cells
3. Destroy soft block — `+5`; sometimes coin drops → walk over → `+10 🪙`
4. Kill bot — `+KILL` popup; score HUD updates
5. Die to blast — Game Over → Retry → same map fresh start, controls work
6. Mobile pad move/hold/bomb + PC arrows still work

## Commit / Preview

*(filled after push)*
