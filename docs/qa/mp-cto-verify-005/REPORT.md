# MP-CTO-VERIFY-005 — CTO Report

**Branch:** `content-factory`  
**Commit:** `ff359c1`  
**Preview (Visit URL):** https://game29-3f7b30ob0-jyp-ai1s-projects.vercel.app  
**Production:** HOLD  
**Vercel project:** game29  

## Changes (minimal scope)

| Area | Change |
| --- | --- |
| Bomber | Solo authoritative host when only human alive; ignore stale remote `state` sync that reset grid input; `bomber-local-player` testid + grid attrs |
| QA | `tools/qa/mp-cto-verify-005.mjs` — extends 004 with P0 code probes, regression matrix, engine `tryMove` check, evidence dir |

## Automated results (`55/63` PASS)

**Script:** `node tools/qa/mp-cto-verify-005.mjs`  
**Report:** `docs/qa/mp-cto-verify-005/verify-report.json`

### PASS highlights

- Auth redirect code (sessionStorage + origin callback)
- Mobile pad contract (150ms dedupe, `lg:hidden`, Snake pad before first move, Agar touch-steer blocked)
- Snake P0 code (TOP10 length DESC, outside-top10 rank, gem +1/+2/+3, character-less purge, HUD BOOST)
- Agar frozen baseline code probes
- Bomber MAP_ROSTER `[4,4,6,6]`, solo host, engine `tryMove` right (unit-level)
- Invite copy/share + slug-correct URLs (Snake/Agar WORLD-*, Bomber BOMBER-*)
- Same-world URL pinning (WORLD-SAME005 / BOMBER-B)
- Snake + Bomber mobile pad layout (iPhone 13 emulation)
- Regression: Home, Detail (incl. flagship Snake), Creator, Admin

### FAIL (8)

| Check | Root cause | Severity |
| --- | --- | --- |
| `agar-mobile-pad-*` (7) | Agar dies quickly in headless; pad hidden when `!alive` | Automation flake — code OK |
| `bomber-grid-one-cell-move` | Keyboard right did not advance grid in Playwright (engine `tryMove` PASS) | Needs real-device / manual confirm |

## P0 matrix

| P0 | Code | Auto | Real device |
| --- | --- | --- | --- |
| Mobile D-Pad | PASS | PARTIAL (Agar death flake) | PENDING |
| Mobile Action | PASS | PARTIAL | PENDING |
| Snake | PASS | PASS | PENDING (L300 feel) |
| Agar (frozen) | PASS | PARTIAL | PENDING |
| Bomber | PASS | PARTIAL (grid browser) | PENDING |
| Invite/Share | PASS | PASS | PENDING (OS share) |
| Same World | PASS | PASS (URL pin) | PENDING (2-device) |
| Auth | PASS | PASS (code) | PENDING_EXTERNAL_CONFIG |
| Death/Retry/Exit | PASS | PASS (code + overlay testids) | PENDING |

## Evidence

- `docs/qa/mp-cto-verify-005/verify-report.json`
- `docs/qa/mp-cto-verify-005/*-mobile-pad.png`
- `docs/qa/mp-cto-verify-005/bomber-grid-move.png`
- Bomber unit tests: 15/15 PASS (`games/bomber`)

## Known issues

1. Agar automation: player often dead before mobile pad snapshot — not a pad regression; retry path added to script.
2. Bomber grid: engine moves correctly offline; Preview Playwright keyboard did not observe DOM grid change — likely stale sync / focus; solo-host fixes landed (`ff359c1`).
3. `/api/build-info` not JSON on Preview — use Vercel deployment SHA.
4. OAuth LIVE round-trip not re-verified (Supabase redirect URIs per Preview host).

## External config required

1. Google OAuth / Supabase: each Preview host `/auth/callback` in allowed redirect URIs.

## CTO recommendation

**NOT_READY_FOR_CPO** — automated suite FAIL (8 checks); P0 Bomber 1-grid browser + Agar mobile-alive + 2-device same-world + OAuth LIVE remain **PENDING real device / external config**. Code fixes shipped; re-run after CTO phone QA.
