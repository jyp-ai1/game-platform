# MP-CTO-CPO-QA-008 — CPO Test Plan

## Re-run automation (PowerShell)

```powershell
cd C:\Users\김성길\Documents\GitHub\game-platform
$env:QA_BASE_URL="https://game29-XXXX.vercel.app"
$env:QA_COMMIT="<git-sha>"
node tools/qa/mp-cto-cpo-qa-008.mjs
```

## Evidence to review

| File | What it proves |
| --- | --- |
| `verify-report.json` | All auto gate PASS/FAIL |
| `screenshots/bomber-dual-context-a.png` | Host client after A moved |
| `screenshots/bomber-dual-context-b.png` | Guest sees synced positions |
| `screenshots/*-mobile-pad.png` | Floating pad regression (007) |
| `screenshots/bomber-grid-move.png` | Continuous grid move (local QA) |

## CPO manual checks (device)

### Bomber MP (dual phone or 2 browser tabs)
1. Open invite URL on Phone A → Map B → ENTER
2. Wait until HUD shows **HOST** and heart (not hourglass)
3. Open same invite on Phone B → Map B → ENTER
4. B must show **SYNC** (not HOST) and distinct spawn corner
5. Move A → B sees A move; move B → A sees B move

### Agar split (with `mp_qa_split=1` in QA URL only)
1. Mass ≥ 48 before split test
2. Space → 2+ YOU cells
3. Normal play URLs unchanged (no mass seed)

### Mobile pad (regression from 007)
1. Left-half touch → floating joystick
2. Hold → continuous move
3. Right-half SPLIT/EJECT/BOOST/BOMB

**CPO FINAL:** _pending device QA_
