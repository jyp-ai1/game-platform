# GAME-DEV-002 — Agar Gameplay Improvement

**Status:** IMPLEMENTED (Preview QA pending deploy)

## Scope

| Feature | Implementation |
| --- | --- |
| Eat feedback | `+N` popup, brief cell scale pulse, engine `feedback.kind=eat` |
| Growth stages | Small (<80) / Medium (80–199) / Large (200+) — YOU bar badge + cell glow |
| Hazard | 8 toxic zones — mass chip (~8%, max 10), 1.4s cooldown, red flash + `-N` popup |
| Game Over / Retry | `MultiplayerDeathOverlay` + `data-testid="agar-game-over"`; Retry → `respawnPlayer` in-place |

## Changed files

```
games/agar/src/agar-io-engine.ts
games/agar/src/Agar.tsx
```

## Protected (not modified)

- Snake, Bomber, platform SDK, Game Registration, Comments
- Bomber MP Death Sync
- New QA Gate — none

## Local verify

- `npm run typecheck` in `games/agar` — PASS

## Preview verify (PM / manual)

1. ENTER → Agar WORLD — eat gems → mass up + `+N` popup
2. Grow past 80 / 200 — stage badge Small → Medium → Large
3. Enter red toxic zone — mass drops, red flash, `-N` popup, no instant death
4. Re-enter quickly — cooldown blocks drain loop
5. Die → Game Over → Retry → new cell at start mass, controls work
6. Mobile pad Split/Eject + PC mouse aim still work

## Commit / Preview

| Field | Value |
| --- | --- |
| Commit | `157d4de` |
| Branch | `content-factory` |
| Preview URL | https://game29-8timpe6ny-jyp-ai1s-projects.vercel.app |
| Visit (WORLD) | https://game29-8timpe6ny-jyp-ai1s-projects.vercel.app/games/agar/play?room=WORLD |
| Deploy | game29 `dpl_2JEdunL8wyePhTgnfoAQ45nW7pUs` — Ready |
| Local typecheck | PASS |

## Preview smoke (automated)

- ENTER → Agar canvas/HUD/TOP10 loads — PASS
- Screenshot: `docs/qa/game-dev-002/01-world-playing.png`

## Status

**GAME-DEV-002 COMPLETE** — dev + typecheck + Preview deploy + entry smoke PASS.
Eat feedback / hazard / death-retry — PM manual play recommended.
