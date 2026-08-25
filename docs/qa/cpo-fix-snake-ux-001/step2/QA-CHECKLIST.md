# FIX-SNAKE-UX-001 Step2 — QA Checklist

**Preview Visit URL:** _(fill after deploy)_  
**Commit:** _(fill after commit)_  
**Production:** HOLD

## Candidate files (touched)

| File | Role |
| --- | --- |
| `games/snake/src/SnakeIo.tsx` | HUD layout, visual grid, fullscreen target includes side HUD |
| `games/snake/src/snake-minimap.tsx` | YOU sync / hide dead / TOP10 # markers |
| `games/snake/src/snake-ranking-panel.tsx` | `L:n` display |
| `games/snake/src/snake-fullscreen.ts` | `sideHudPx` reserve |
| `games/snake/src/snake-path-movement.ts` | smootherstep render interp (visual only) |
| `games/snake/src/snake-feel-tuning.ts` | visual grid subdiv/opacity only |

## Frozen (not touched)

Death / killSnake / dropFood / updateRankings core / collision / loot / auth / respawn engine structure

## Checklist

| # | Item | Result |
| --- | --- | --- |
| 1 | Movement looks continuous (no cell-step feel); physics unchanged | □ |
| 2 | Background grid faint / not readable as step units | □ |
| 3 | Respawn L10 smoke (Step1) still PASS | □ |
| 4 | Minimap YOU sync; hide when dead; show on respawn | □ |
| 5 | Minimap no right clip @ 1440×900 / small / fullscreen | □ |
| 6 | Minimap shows TOP10 number markers from existing rankings | □ |
| 7 | TOP10 panel shows Length as `L:n` | □ |
| 8 | Fullscreen enter/exit + fallback; HUD/minimap OK after | □ |
| 9 | Minimap + TOP10 do not cover / overlap playfield | □ |
| 10 | No ping spike / FPS crash vs Step1 | □ |

## CEO TEST

1. Open **Preview Visit URL only** (not Production)
2. Enter WORLD — move 20s — motion continuous, grid not cell-step
3. Check minimap YOU + TOP10 `#` markers; die → YOU gone; respawn L10 → YOU back
4. Resize 1440×900 and smaller — minimap not clipped
5. Fullscreen on/off — TOP10 + minimap still usable
6. Confirm Length column `L:n` matches Length HUD
