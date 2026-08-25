# FIX-SNAKE-UX-002 — Measurement + Fix Evidence

## Numbers (codepath / balance)

| Metric | Human | Bot |
| --- | --- | --- |
| Physics tick ms | **104** (1P: 120/1.15) | same host tick |
| Render FPS | ~60 RAF | ~60 |
| Position change ms | **~104–120** | **~104–120** |
| Delta / physics update | **1.0** world-unit | **1.0** |
| `interpolateSnakeRender` on draw | YES (local+bots w/ snap) | YES |
| Camera before fix | PHYSICS head (stepped) | — |

Runtime dump: append `?debug=snake-move` → `localStorage["play29:snake-move-debug"]` / `window.SnakeMoveDebug.report`.

## Frozen snakes

| Suspect | Root |
| --- | --- |
| Dead ghosts on board | `alive=false` still drawn opacity-25 |
| Bot `awaitingInput` | tickWorld skips move |

## Fixes (one cause each)

1. **Movement** — camera follows `interpolateSnakeHead` (same blend as draw); denser sampling of existing alpha; grid opacity 0
2. **Minimap YOU** — one gate + stable marker (no remount)
3. **TOP10** — `L:n` + ★ self row
4. **Fullscreen** — toggle on real FS state (not worldLayout); fullscreenElement logged under debug
5. **Stationary** — hide dead/spectating; clear bot awaitingInput in brain tick
