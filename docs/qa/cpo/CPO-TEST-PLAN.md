# CPO 2차 QA — 실행 가이드

**Gate:** CTO PASS + Evidence → CPO 2차 검증 → CPO PASS → CEO (3항목만)

**CEO / Production:** HOLD until CPO PASS

---

## 1. 실행

```powershell
cd C:\Users\김성길\Documents\GitHub\game-platform

# Preview Visit URL + commit SHA 지정
$env:QA_BASE_URL="https://game29-<visit>.vercel.app"
$env:QA_COMMIT="<sha>"

npm run qa:mp
```

또는:

```powershell
node tools/qa/mp-cto-cpo-qa-010.mjs
```

---

## 2. Evidence 확인

```
docs/qa/cpo/mp-cto-cpo-qa-010/
├── CTO-REPORT.md
├── CPO-REPORT.md
├── verify-report.json
├── dual-context-report.json
└── screenshots/
```

---

## 3. CPO 검토 체크리스트

### ① 변경사항
- [ ] Bomber host/guest **distinct spawn** (not both `(1,1)`)
- [ ] Player bomb sync (NOT bot coincidence)
- [ ] Mobile Dynamic Floating Pad 유지

### ② Regression
- [ ] Snake: Character, Color, BOOST, TOP10, Invite
- [ ] Agar: SPLIT, EJECT, Virus — **게임 룰 변경 없음**

### ③ Evidence
- [ ] `dual-context-report.json` — playerA ≠ playerB, spawnA ≠ spawnB
- [ ] `playerBombOnly: true` when bomb sync claimed
- [ ] CTO FINAL = PASS (12/12) before CPO PASS

### ④ 위험도
- [ ] Real device mobile feel — EXTERNAL PENDING OK if documented

---

## 4. CPO PASS 조건

```
CTO FINAL: PASS
+
Evidence matches claims
+
No regression on Agar/Snake contract
```

→ CEO에게 **3개만** 요청:

1. 모바일 실제 조작감
2. 친구 초대 → 같은 방
3. Bomber 폭탄 양쪽 동시 폭발

---

## 5. 현재 Gate (2026-08-30)

| Gate | Status |
| --- | --- |
| MP-010 CTO | **FAIL (8/12)** @ `e3b70d4` (was 3/12 @ `67b7e02`) |
| CPO | **HOLD** — see `mp-cto-cpo-qa-010/CPO-REPORT.md` |
| CEO | **HOLD** |
| Production | **HOLD** |

Preview ref (best run): https://game29-rk2787cuy-jyp-ai1s-projects.vercel.app

**MP-011 next:** A/B move sync · death sync · guest seat `(13,1)` on fresh preview
