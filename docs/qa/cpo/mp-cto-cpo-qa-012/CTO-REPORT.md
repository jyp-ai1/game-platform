# MP-CTO-CPO-QA-012 — CTO FINAL REPORT

STATUS: FAIL

COMMIT: c1eeae8

PREVIEW:
(none — push/deploy pending)

PREVIEW SHA:
n/a

AUTOMATED:
8/12 PASS (best full run local) · 14/14 dual-context PASS (isolated run local:3042)

BROWSER:
PASS (isolated dual-context) / FAIL (full suite Supabase flake)

REGRESSION:
PASS (mobile + unit; agar intermittent)

CPO REVIEW READY:
NO

CEO TEST:
HOLD

PRODUCTION:
HOLD

## P0 RESULT

| Test | Result | Evidence |
|---|---|---|
| Distinct playerId | PASS | dual-context-report.json |
| Distinct spawn | PASS | spawn (1,1) vs (13,1) |
| A → B movement | PASS | movementA 3/3 synced |
| B → A movement | PASS | movementB 3/3 synced |
| Player bomb | PASS | ownerId=host human |
| Bomb owner sync | PASS | bombs on A/B |
| Explosion sync | PASS | player bomb only |
| Death sync | PASS | victim B alive=false both contexts |
| AI movement | PASS | bomber-ai-movement-10s |
| Mobile regression | PASS | screenshots/ |
| Agar regression | PASS/FAIL | intermittent split |
| Full regression | PASS | unit + mobile |

## ROOT CAUSE

1. **Guest split-brain (FIXED):** Joiner `claimStaleShardRoom` ran on guest when host state missing → dual host authority. Fixed: only `mp_qa_fresh` host may reclaim; guest waits for broadcast room.
2. **Movement reset (FIXED):** `reconcileHumans` pinned humans every tick. Fixed: overlap-only pin + `mp_qa_fresh` never reuses stale Supabase shard.
3. **Supabase stale shard (PARTIAL):** Async `deleteRoom` race before guest join causes intermittent guest-seat FAIL on repeated BOMBER-B runs.

## FIX

- Guest join: wait for host room broadcast; no guest `createRoom` / shard reclaim
- Host `pushInput`: immediate state broadcast + input publish; unified host authority detection
- Roster-change `reconcileHumans` on subscribe + every host tick
- `rejectStaleTick` + sessionStorage per-tab device IDs for QA
- Harness: input chain evidence, dual-context first, death prep host-only approach
- `mp_qa_fresh`: always fresh world; 2s Supabase delete settle

## VERIFICATION

- Unit: `bomber-online-004.test.ts` 7/7 PASS
- Isolated dual-context @ localhost:3042 — 14/14 PASS (movement/bomb/explosion/death)
- Full `npm run qa:mp` — 8–11/12 intermittent (Supabase BOMBER-B stale / AI kills guest during long prep)

## REMAINING BLOCKERS

P0:
- Fresh game29 Preview deploy + QA with Preview SHA = commit
- Stabilize full-suite dual-context on Supabase (await deleteRoom or unique shard key)

P1:
- Agar split regression intermittent in combined run

## EVIDENCE

- docs/qa/cpo/mp-cto-cpo-qa-012/CTO-REPORT.md
- docs/qa/cpo/mp-cto-cpo-qa-012/verify-report.json
- docs/qa/cpo/mp-cto-cpo-qa-012/dual-context-report.json
- docs/qa/cpo/mp-cto-cpo-qa-012/TEST-RESULT.md

## CTO FINAL

FAIL

CPO REVIEW READY:
NO
