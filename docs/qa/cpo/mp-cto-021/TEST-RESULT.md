# MP-CTO-021 — TEST RESULT

## Authority fix

- `isHostRef` default `false`
- Removed `isHostRef` from `pushInput` / `subscribeRoom` host detection
- Host authority: `room.hostId` + `matchHostIdRef` only

## Preview P0 (5 runs @ 501512f)

| Run | P0 6/6 | Death Sync |
|-----|--------|------------|
| 1 | FAIL 5/6 | FAIL |
| 2 | FAIL 5/6 | FAIL |
| 3 | FAIL 5/6 | FAIL |
| 4 | **PASS 6/6** | PASS (deathOnA/B both `(13,5) alive:false`) |
| 5 | FAIL 5/6 | FAIL |

**Death Sync: 1/5 — target 5/5 not met**

## Unit regression

18/18 PASS
