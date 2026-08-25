# FIX-SNAKE-UX-001 — Step 2 CPO Report

**STATUS:** READY_FOR_CEO_TEST · **CPO GATE:** HOLD until CEO · **Production:** HOLD

| Field | Value |
| --- | --- |
| Task | FIX-SNAKE-UX-001 Step2 + Movement Visual |
| Branch | content-factory |
| Commit | `581bafb` |
| Vercel | game29 only |
| Preview Visit | https://game29-mq2dk0akn-jyp-ai1s-projects.vercel.app |

## Deployment Target

```text
Vercel Project : game29
GitHub Repository : jyp-ai1/game-platform
Branch : content-factory

Production
https://game29.vercel.app
HOLD

Commit
581bafb

Deployment Scope
games/snake/src/ (+ step2 QA evidence)

Legacy project
game-platform (Vercel Project) : Removed / Do not use
```

## Candidate files

1. `games/snake/src/SnakeIo.tsx` — layout, visual grid, fullscreen HUD shell  
2. `games/snake/src/snake-minimap.tsx` — YOU sync / dead hide / TOP10 #  
3. `games/snake/src/snake-ranking-panel.tsx` — `L:n`  
4. `games/snake/src/snake-fullscreen.ts` — side HUD gutter  
5. `games/snake/src/snake-path-movement.ts` — smootherstep interp  
6. `games/snake/src/snake-feel-tuning.ts` — visual grid subdiv/opacity  

## Changed

### A. Movement visual (physics UNCHANGED)
- Render blend: smoothstep → **smootherstep** in `interpolateSnakeRender` (coords/collision untouched)
- Board background: denser visual subdivision (`cellSize/2`) + opacity `0.04` → `0.012` (visual only)

### B. Step 2 HUD
- Minimap YOU uses `resolveSnakeHead`; hidden when `!alive` / spectating; returns on respawn
- TOP10 `#` markers from existing `getDisplayRankings` order (no new ranking calc)
- TOP10 panel Length display `L:n`
- Side HUD widths `clamp(...vw...)` + `sideHudPx` board measure — relative to play area (fixes right clip)
- Fullscreen target (`viewportRef`) includes TOP10 + minimap; enter/exit + pseudo fallback retained

## Not Changed
Death / killSnake / dropFoodFromSnake / updateRankings core / collision / loot / auth / respawn engine structure / Production

## Evidence
`docs/qa/cpo-fix-snake-ux-001/step2/`

## CEO TEST checklist

1. Preview Visit URL only (not Production)  
2. WORLD · move 20s — continuous motion; grid not perceived as cell steps  
3. Minimap YOU sync; die → marker gone; respawn **L10** → YOU immediate  
4. Layout 1440×900 + smaller + fullscreen — minimap not right-clipped  
5. TOP10 shows `L:n`; minimap shows rank numbers 1–10 from existing rankings  
6. Fullscreen enter/exit — HUD/minimap OK  
7. TOP10 + minimap do not cover playfield  
8. No ping spike / FPS crash vs Step1  

**STOP** — Production HOLD · Step 3 not started.
