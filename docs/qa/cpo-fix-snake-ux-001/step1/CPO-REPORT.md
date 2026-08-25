# FIX-SNAKE-UX-001 — Step 1 CPO Report

**STATUS:** READY_FOR_CEO_TEST · **CPO GATE:** HOLD until CEO · **Production:** HOLD

| Field | Value |
| --- | --- |
| Task | FIX-SNAKE-UX-001 Step1 |
| Branch | content-factory |
| Commit | `0f719f0` |
| Vercel | game29 only |
| Preview Visit | https://game29-g70s2qh3a-jyp-ai1s-projects.vercel.app |

## Changed
- Render interpolation: time-based `renderAlpha` between physics ticks (reuses `interpolateSnakeRender`; physics/collision coords unchanged)
- Camera: follow lerp 0.52→0.22; slight zoom-out (`baseCameraZoom` 1.4→1.28, `viewportCellsVisible` 50→56)
- Ping: ResourceTiming on `/vercel.svg` (not wall-clock `HEAD /`)
- Respawn length: `respawnSnake` uses `SNAKE_MVP_RC1.startingSegments` (10)

## Not Changed
Death · LB · Collision · Loot · Respawn engine structure · Step 2/3 · Production

## Ping before / after
| | Idle | Moving (HUD) |
| --- | --- | --- |
| Before (CEO + wall HEAD `/`) | ~30ms | ~800ms |
| After (intended HUD = ResourceTiming) | ~28–38ms steady static probe | should stay near idle (CEO confirm) |

Root cause: wall-clock await after fetch resumed late when main thread was busy with tick clone/React — false RTT spike.

## Respawn length proof
`finalizeSnake(..., 3, 0)` → `finalizeSnake(..., SNAKE_MVP_RC1.startingSegments, 0)` — see `respawn-length-proof.json`.

## CEO TEST
1. Preview Visit URL only  
2. Enter WORLD · move 30s — smooth motion, stable camera  
3. Watch HUD ping while moving — must not spike to ~800  
4. Die → respawn at **L10**  
5. No death/LB/loot/collision regression  

**STOP** — do not start Step 2/3.
