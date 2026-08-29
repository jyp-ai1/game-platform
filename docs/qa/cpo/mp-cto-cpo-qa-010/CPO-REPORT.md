# MP-CTO-CPO-QA-010 — CPO Report

**Date:** 2026-08-29  
**Branch:** `content-factory`  
**Code Commit:** `bb0cecc`  
**Preview (QA run):** https://game29-jnwrz6rye-jyp-ai1s-projects.vercel.app  
**Evidence:** `docs/qa/cpo/mp-cto-cpo-qa-010/`

---

## CPO Gate Verdict

| Gate | Result |
| --- | --- |
| **CTO FINAL** | **FAIL** (4/12 P0) |
| **CPO Review** | **FAIL — HOLD** |
| **CEO Test** | **HOLD** |
| **Production** | **HOLD** |

CPO는 CTO FINAL = PASS 전까지 CEO/CPO 실기기 테스트를 시작하지 않습니다.

---

## CPO 판정 요약

010은 **009 대비 일부 개선**이 있으나, **12/12 P0 기준 미달**로 **CPO FAIL**입니다.

| 항목 | 009 | 010 | CPO 판정 |
| --- | --- | --- | --- |
| Same Room | PASS | PASS | 🟢 |
| playerId 분리 | PASS | PASS | 🟢 |
| stateAck | PASS | PASS (code probe) | 🟢 |
| Host seat (isHost + local) | FAIL (spawnA null) | **FAIL** (spawnA exists but isHost/state gate fail on Preview) | 🔴 |
| Distinct spawn | FAIL | **FAIL** (both `(1,1)`) | 🔴 |
| A↔B movement sync | FAIL | **FAIL** | 🔴 |
| Player bomb sync | FAIL (bot coincidence) | **FAIL** (no player bomb) | 🔴 |
| Explosion / Death sync | FAIL | **FAIL** | 🔴 |
| AI 10s move | FAIL | **FAIL** | 🔴 |
| Mobile regression | PASS | **PASS** | 🟢 |
| Agar split regression | FAIL | **PASS** (Preview run 08:50 UTC) | 🟢 |
| Unit regression | PASS | **PASS** (17/17 bomber unit) | 🟢 |

**Bomb sync PASS는 인정하지 않음** — 010에서도 player-owned bomb 미검증.

---

## dual-context-report.json 실측 (BOMBER-B)

```json
{
  "roomId": "BOMBER-B",
  "playerA": "qa010-host-*",
  "playerB": "qa010-guest-*",
  "spawnA": { "x": 1, "y": 1 },
  "spawnB": { "x": 1, "y": 1 },
  "positionA_after": null,
  "positionB_after": null,
  "bombId": null,
  "playerBombOnly": false,
  "explosion": false,
  "death": false
}
```

**핵심:** Host spawn은 009의 `null`에서 `(1,1)`로 **부분 개선**됐으나, **Guest와 동일 좌표** → spawn 충돌 · movement/bomb chain 불가.

---

## 010 코드 변경 (bb0cecc)

- `reconcileHumans`: Host seat 0 pin on guest join
- Guest stateAck gate 강화 (local world fallback 제거 방향)
- Unit: `bomber-online-003/004` host seat tests **PASS**
- QA harness: `tools/qa/mp-cto-cpo-qa-010.mjs`

**Code/unit PASS ≠ Dual Context PASS.** Preview dual-context에서 P0 미통과.

---

## CPO 12/12 Gate 체크리스트

| # | P0 | Result |
| --- | --- | --- |
| 1 | Host seat 유지 | **FAIL** |
| 2 | Guest seat 분리 | PASS |
| 3 | Distinct spawn | **FAIL** |
| 4 | A→B sync | **FAIL** |
| 5 | B→A sync | **FAIL** |
| 6 | Player bomb | **FAIL** |
| 7 | Explosion | **FAIL** |
| 8 | Death | **FAIL** |
| 9 | AI 10s | **FAIL** |
| 10 | Mobile | PASS |
| 11 | Agar | PASS |
| 12 | Regression | PASS |

**Score: 4/12 — CTO FINAL FAIL**

---

## CPO → CEO 역추적 (009/010 vs CEO 이슈)

| CEO 이슈 | 010 상태 |
| --- | --- |
| A/B 같은 캐릭터/위치 | **미해결** — both `(1,1)` |
| Host 제어 불가 | **부분** — spawnA 생겼으나 sync/move 실패 |
| AI 멈춤 | **미해결** |
| 폭탄 미동기화 | **미해결** — player bomb 테스트 불가 |
| Agar split QA | **해결** (harness) |
| Mobile pad | **유지 PASS** |

---

## CPO 권고 — MP-011

1. **Seat/spawn 단일 authority** — Host seat 0, Guest seat 1, **서로 다른 spawn 좌표** 강제
2. Guest join 후 **Host `isHost` + `local` player DOM** 유지 검증
3. Dual-context에서 **A/B movement → player bomb → explosion → death** player-action-only
4. Preview @ `bb0cecc` Visit URL에서 harness 재실행 후 Evidence 갱신

---

## 재현 명령 (CPO 2차 검증용)

```powershell
cd C:\Users\김성길\Documents\GitHub\game-platform
$env:QA_BASE_URL="https://game29-<visit-url>.vercel.app"
$env:QA_COMMIT="bb0cecc"
node tools/qa/mp-cto-cpo-qa-010.mjs
```

Evidence: `docs/qa/cpo/mp-cto-cpo-qa-010/verify-report.json`, `dual-context-report.json`

---

**CPO FINAL: FAIL**  
**Next: MP-CTO-CPO-QA-011** — distinct spawn + host isHost after guest join + player bomb chain
