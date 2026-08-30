# MP-CTO-CPO-QA-011

## Build

- Commit: `bdf6b69`
- Branch: `content-factory`
- Preview: **ENVIRONMENT_FAILURE** — fresh Visit URL for `bdf6b69` not verified (game29 deploy pending at report time). Best-effort run on stale preview `https://game29-rk2787cuy-jyp-ai1s-projects.vercel.app` (prior commit).
- Date: 2026-08-30T07:21:05.878Z

## CTO Final

**FAIL**

## Automated QA

4/12 PASS

## P0 Results

| Test | Result | Evidence |
|---|---|---|
| Same Room | PASS | `dual-context-report.json` roomId=BOMBER-B |
| Different playerId | PASS | playerA.id ≠ playerB.id |
| Different seat | FAIL | both seat 0 — host dead at (1,1) |
| Different spawn | FAIL | both (1,1) |
| A movement sync | FAIL | host alive:false, posA1 null |
| B movement sync | FAIL | posB2 null |
| Human player bomb | FAIL | no player-owned bomb |
| Bomb sync | FAIL | bombsA/B empty |
| Explosion sync | FAIL | explosion false |
| Death sync | FAIL | death chain not reached |
| AI 10s movement | PASS | aiMoved true |
| Mobile regression | PASS | screenshots/ |

## Root Cause

**CODE_FAILURE (primary — fixed in `bdf6b69`, not on stale preview):**
- `reconcileHumans` pinned all humans to spawn **every host tick**, resetting movement and preventing sync chain.

**CODE_FAILURE (remaining on preview without `bdf6b69`):**
- Host resumes/joins dead on shared BOMBER-B shard; guest overlaps host at (1,1).

**ENVIRONMENT_FAILURE:**
- Fresh game29 Preview deployment for `bdf6b69` not available at QA time — ran against stale Visit URL.

## Fix

- `reconcileHumans`: overlap-only seat pin (movement persists across ticks)
- Host tick: drain all `input:*` from gameState with timestamp dedupe
- Guest `pushInput`: `sync()` after send
- Unit tests: `ONLINE-004` +2 (movement persist, overlap pin)
- Harness: `tools/qa/mp-cto-cpo-qa-011.mjs`, `npm run qa:mp`

## Regression

- Agar split: PASS (preview run)
- Unit: 21/21 local (`bomber-online-004` all PASS)
- Mobile Floating Pad: PASS

## Remaining Issues

1. Deploy `bdf6b69` to game29 Preview Visit URL → re-run `npm run qa:mp`
2. Verify move/death sync with overlap-only reconcile on live dual-context
3. Fresh shard per QA run (`mp_qa_fresh` host-only — needs deploy verify)
4. Guest distinct seat `(13,1)` when host alive

## Recommendation

**NOT_READY_FOR_CPO**

**CPO Review Ready:** NO  
**CEO Test:** HOLD  
**Production:** HOLD
