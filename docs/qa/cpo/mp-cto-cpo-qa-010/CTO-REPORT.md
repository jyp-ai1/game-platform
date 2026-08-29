# MP-CTO-CPO-QA-010 — CTO Report

Commit: 300901d
Preview: https://game29-rk2787cuy-jyp-ai1s-projects.vercel.app
Finished: 2026-08-29T13:50:50.576Z

## Root Cause (Dual Context FAIL — partial fix)

1. **Host seat race (009)** — `spawnA=null` when guest joins; host dropped from `world.players` during `reconcileHumans` / ghost shard host.
2. **010 code fix** — `reconcileHumans({ hostId })` pins seat 0, overlap deconflict, shard reclaim when no live sim host (`freshState + simHostAlive`).
3. **Best Preview run (9d62522 @ kx4av377w)** — `gate-host-seat PASS` (`isHost=true`, `spawnA=(1,1)`). Regression on 300901d: host `alive:false` from stale dead-state resume → host-seat gate FAIL.
4. **Guest seat / distinct spawn** — both contexts at `(1,1)`; guest `stateAck` intermittently false; movement/bomb chain blocked.
5. **Player bomb** — no player-owned bomb planted (`bombId=null`); bot bomb coincidence rejected by harness.

## 12/12 CTO Gates
| # | Gate | Result |
| --- | --- | --- |
| 1 | Host seat (spawnA != null, alive, isHost) | FAIL |
| 2 | Guest seat | FAIL |
| 3 | Distinct spawn | FAIL |
| 4 | A move sync | FAIL |
| 5 | B move sync | FAIL |
| 6 | Player bomb sync (NOT bot) | FAIL |
| 7 | Explosion sync | FAIL |
| 8 | Death sync | FAIL |
| 9 | Bomber AI 10s | FAIL |
| 10 | Mobile regression | PASS |
| 11 | Agar split regression | PASS |
| 12 | Unit regression | PASS |

## Auto checks
24/33

## Failed
- bomber-ai-movement-10s
- gate-host-seat
- gate-guest-seat
- gate-distinct-spawn
- gate-a-move-sync
- gate-b-move-sync
- gate-player-bomb-sync
- gate-explosion-sync
- gate-death-sync

## dual-context-report.json (player bomb only)
See `dual-context-report.json` — `playerBombOnly: false`, `spawnA/spawnB` both `(1,1)`.

**CTO FINAL:** FAIL (3/12)
**CPO Review Ready:** NO
**CEO Test:** HOLD
**Production:** HOLD
