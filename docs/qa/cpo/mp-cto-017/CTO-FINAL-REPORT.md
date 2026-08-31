# MP-CTO-017 — CTO FINAL REPORT

STATUS:
PASS

COMMIT:
177b599

PREVIEW:
https://game29-fw8l2slaw-jyp-ai1s-projects.vercel.app

SCOPE:
Agar 실사용 안정성 점검

AUTOMATED:
12/12

BROWSER:
PASS

REAL DEVICE:
PENDING_EXTERNAL

## P0 RESULT

| # | Test | Result | Evidence |
|---|---|---|---|
| 01 | Agar Preview 진입 | PASS | HTTP 200 · ENTER visible |
| 02 | Game Start | PASS | __AGAR_QA__ alive · tick>0 |
| 03 | Floating Pad | PASS | mp-mobile-control-pad visible |
| 04 | Direction Input | PASS | 4/4 aim delta |
| 05 | Hold Movement | PASS | position delta d0/d1 > 0.8 |
| 06 | Pad Release | PASS | joystick hidden on pointerup |
| 07 | Split | PASS | cells increase |
| 08 | Eject | PASS | mass decrease |
| 09 | PC Regression | PASS | mouse aim + Space split |
| 10 | Agar Regression | PASS | alive · mass · tick |
| 11 | Invite Regression | PASS | WORLD-QA017B · /games/agar/play |
| 12 | Mobile Regression | PASS | pad · split/eject · joy ≤120px |

## CHANGED FILES

- `tools/qa/mp-cto-017-agar-ux.mjs` — Agar UX P0 harness (12 gates)

*(Agar 게임 코드 변경 없음 — MP-CTO-014/015 구현 재검증)*

## KNOWN LIMITATIONS

- Real-device touch feel not verified (REAL_DEVICE PENDING_EXTERNAL).
- Agar multiplayer sync / Bomber **out of scope**.
- Ranking API 409 console noise filtered (non-critical).
- `mp_qa_pad=1` / `mp_qa_split=1` used in automation only (existing MP-CTO-014 pattern).

## EVIDENCE

- `docs/qa/cpo/mp-cto-017/verify-report.json`
- `docs/qa/cpo/mp-cto-017/TEST-RESULT.md`
- `docs/qa/cpo/mp-cto-017/deploy-out.txt`
- `docs/qa/cpo/mp-cto-017/screenshots/`

## CTO FINAL

PASS

## CPO REVIEW

READY

## CEO TEST

HOLD
