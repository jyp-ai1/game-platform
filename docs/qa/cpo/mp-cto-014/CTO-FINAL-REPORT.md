# MP-CTO-014 — CTO FINAL REPORT

STATUS:
PASS

COMMIT:
fee12ea

PREVIEW:
https://game29-kp6n6jfy2-jyp-ai1s-projects.vercel.app

SCOPE:
Agar Mobile Control Only

## P0 RESULT

| Test | Result | Evidence |
|---|---|---|
| Game Start | PASS | __AGAR_QA__ started + alive + tick>0 |
| Floating Pad | PASS | verify-report.json · screenshots/agar-mobile-p0.png |
| Pad Position | PASS | data-touch-x/y on mp-floating-joystick |
| Direction Input | PASS | 4-way aim delta after pad drag |
| Hold Movement | PASS | position delta d0/d1 > 0.8 while pad held |
| Input Persistence | PASS | totalDist > 4 over 2.3s hold |
| Pad Release | PASS | mp-floating-joystick hidden on pointerup |
| Split | PASS | cells 1→2 via mp-pad-action-split |
| Eject | PASS | mass decrease via mp-pad-action-eject |
| UI Selection Block | PASS | mp-top10 user-select:none (SDK shell) |
| Game Screen Interference | PASS | joystick ≤120×120 + action zones |
| PC Regression | PASS | mouse aim + Space split on desktop |
| Agar Regression | PASS | alive + mass + tick after enter |

## Automated

13/13 PASS @ Preview Visit URL (`node tools/qa/mp-cto-014-mobile.mjs`)

Local: 13/13 PASS @ http://localhost:3025

## Browser

PASS — Playwright iPhone 13 + desktop mouse/keyboard

## Real Device

PENDING_EXTERNAL

## Changed Files

- `games/agar/src/Agar.tsx` — steer hold persistence (`lastSteerRef`), `onDirectionEnd`, extended `__AGAR_QA__`
- `tools/qa/mp-cto-014-mobile.mjs` — Agar mobile P0 harness (13 gates)

## Evidence

- `docs/qa/cpo/mp-cto-014/verify-report.json`
- `docs/qa/cpo/mp-cto-014/screenshots/agar-mobile-p0.png`
- `docs/qa/cpo/mp-cto-014/deploy-out.txt`

## Known Limitations

- Real-device touch feel not verified (REAL_DEVICE PENDING_EXTERNAL).
- `mp_qa_pad=1` / `mp_qa_split=1` used in automation only (no normal-play change).
- Snake / Bomber / Agar MP / Invite **out of scope**.

## CTO FINAL

PASS

## CPO REVIEW

READY

## CEO TEST

HOLD
