# WO 95631 — Re:Play Live Service Foundation

```text
QUEUED — DO NOT EXECUTE UNTIL PREDECESSORS COMPLETE
선행: WO 84216 CPO Product PASS → CLOSE
구현 없음 · Preview 없음 · Production 작업 없음
Baseline 예정: game29 a0ce9b1
Vercel: game29
Repo: jyp-ai1/game-platform
Branch: promote/product-catalog
```

**Now: QUEUED.** 84216 CLOSE 전 구현 금지.

---

## 0. 최우선 실행 규칙 — 반드시 준수

**EXECUTE AUTONOMOUSLY FOR ~3 HOURS** (84216 CLOSE 후에만).

작업을 받은 뒤 하지 않는다:

- 중간 검토 요청
- 계획 확인 요청
- 부분 결과 보고
- “다음 작업을 달라”
- CEO 중간 테스트 요청
- 10~30분 micro-sprint 분할
- 작업 중 CPO 판단 요청
- “이 범위 이렇게 해도 될까요?” / “검토 부탁드립니다”

즉시 스스로 범위를 확정하고 한 번에 진행한다:

```text
기존 증거 확인
→ 영향 파일 분석
→ 구현
→ 통합
→ Local QA
→ Browser E2E
→ 실패 수정
→ Regression
→ Preview
→ Preview Full E2E
→ Production Promote
→ Production Full E2E
→ Evidence
→ CTO Final QA
```

보고는 전체 작업 종료 후 1회만.

중단/에스컬레이션은 실제 Blocker만:

- P0
- Product Contract를 깨는 변경이 불가피한 경우
- 비가역적 아키텍처 결정
- 제품 정책 판단
- 신규 게임 추가
- STEP4 변경
- 범위를 넘는 중대한 제품 방향 변경

그 외는 CTO가 합리적으로 결정하고 계속 진행한다.

---

## 1. Execution Gate

```text
WO 84216
CPO Product QA
   ↓
84216 CLOSE
   ↓
Production baseline = a0ce9b1 확인
   ↓
WO 95631 OPEN
   ↓
Long Sprint Autonomous Execution
```

실행 시작 시 재확인:

```text
Repository: jyp-ai1/game-platform
Branch: promote/product-catalog
Vercel Project: game29
Production baseline: a0ce9b1
```

Legacy Vercel `game-platform` 사용 금지.

---

## 2. Token Efficiency Rule

1. 기존 QA evidence를 먼저 읽는다.
2. 변경 대상/영향 파일을 먼저 분석한다.
3. PASS 상태 전체 코드베이스를 처음부터 다시 읽지 않는다.
4. 이미 PASS된 게임 전체를 이유 없이 재검증하지 않는다.
5. 기존 증거를 최대한 재사용한다.
6. 동일 검색을 반복하지 않는다.
7. 동일 테스트를 이유 없이 반복하지 않는다.
8. 실패한 영역만 집중 분석한다.
9. 최소 파일 / 최소 코드 변경.
10. broad refactor 금지.
11. 불필요한 shared SDK rewrite 금지.
12. 기존 Product Contract 보존.
13. 중간 보고를 만들지 않는다.
14. 최종 evidence를 한 번에 정리한다.

---

## 3. Product Objective

게임을 4개 실행하는 사이트에서 **실제 지속 플레이가 가능한 Live Service Foundation**으로 끌어올린다.

```text
Player Session
Progression Foundation
Character / Color Extension
Result → Replay Loop
```

Catalog / Detail / Multiplayer / Result와 자연스럽게 연결한다.

---

## 4. Player Session Foundation

일관 처리:

```text
Catalog → Detail → Character → Color → ENTER
→ Connecting → Multiplayer World → Gameplay → Result
```

Result 이후:

```text
REMATCH        → 같은 게임 재진입
ANOTHER GAME   → 다른 공식 게임 선택
EXIT           → 해당 게임 Detail
```

세션 케이스: 정상 입장 · 정상 종료 · Result · Rematch · 재입장 · Refresh · Back · ENTER double-click · stale room · join failure · reconnect · cleanup · 중복 세션 · 종료 후 잔존 상태 · Result 이후 재진입.

세션 상태가 UI와 실제 multiplayer state 사이에서 어긋나지 않게 한다.

---

## 5. Progression Foundation

거대한 RPG를 만들지 않는다. 최소 플레이 진행 기반만.

최소 데이터: play count · result history · win/loss 또는 게임별 결과 · 최근 플레이 상태 · mileage 확장점 · character unlock 확장점.

```text
현재 UX를 깨지 않는 최소 Progression Foundation
```

10742에서 확장 가능하도록 구조만 연다. RPG/경제/인벤토리 금지.

---

## 6. Character / Color Extension

Product Contract 유지: `Character → Color → ENTER`

확장 구조만 준비:

```text
Character  unlocked / locked
Color      available / future unlock extension
```

현재 캐릭터/색상 UX를 깨지 않는다. 복잡한 unlock UI를 강제 노출하지 않는다.

---

## 7. Result → Replay Loop

Result를 다음 플레이 Hub로 정리:

```text
Gameplay → Result
  ├─ REMATCH      → Gameplay
  ├─ ANOTHER GAME → Catalog / 다른 공식 게임
  ├─ Progress     → 최소 진행 정보
  └─ EXIT         → 해당 게임 Detail
```

Rematch 후 실제 gameplay 재시작. 이전 세션 Result 오재사용 금지.

---

## 8. Catalog / Detail Foundation

공식 4게임: Snake · Agar · Bomber · Re:Front

유지/정리: thumbnail · hero · title · one-line · multiplayer 정보 · gameplay feature · 명확한 CTA · Detail → multiplayer entry

Discover `/games`와 공식 `/play`를 혼동하지 않는다.

---

## 9. Game-specific Integration

**Snake:** MP session · gameplay · Result · Rematch · 재입장 · progression · mobile · HUD · cleanup

**Agar:** Host/Guest · MP session · gameplay · Result · Rematch · progression · mobile · join/reconnect. Host reclaim / join failure Contract 유지.

**Bomber:** MP shard/session · Host/Guest · gameplay · death · win/loss · Result · Rematch · progression · Retry/Back · cleanup.  
`NO Bomber Map Select` · `NO BOMBER-SOLO` · `NO Solo fallback`

**Re:Front:** 엔진 재작성/대규모 구조 변경 금지. session/result 연결 · progression · Result · Rematch · MP entry. **STEP4 보호.**

---

## 10. 절대 금지 Product Contract

```text
NO Solo
NO PRACTICE
NO fallback=1
NO BOMBER-SOLO
NO silent Solo fallback
NO infinite Connecting
NO Exit → Home
NO Another Game → generic Discover /games
NO Bomber Map Select
NO STEP4 regression
```

정상 MP failure = Retry / Back.

---

## 11. Full E2E

각 공식 게임 최소 흐름:

```text
Catalog → Detail → Character → Color → Multiplayer World
→ real Gameplay → Result → Rematch → Gameplay → Result
→ Another Game → another game's Multiplayer → Exit → Detail
```

추가: Desktop · Mobile 390 · Host/Guest · Refresh · Back · ENTER double-click · join failure · Retry · reconnect · stale session · repeated Rematch · Result state integrity · session cleanup

이미 PASS된 영역은 기존 evidence 재사용. 이번 변경 영향분만 집중 재검증.

---

## 12. QA Pipeline

**A Existing Evidence:** 84216 · 이전 CPO PASS · Product Contract · affected files

**B Implementation:** Session + Progression + Character extension + Result/Replay + Catalog/Detail. 최소 코드.

**C Local QA:** typecheck · build · affected unit/integration · affected browser E2E · 4 games critical path. 실패 시 즉시 수정.

**D Regression:** 변경과 직접 연결된 PASS 영역만. 전체 프로젝트 무조건 재테스트 금지.

**E Preview:** Preview deploy 후 Full E2E (Desktop + Mobile 390 + 4 Games + Session + Result + Rematch + Another Game + Exit + Failure/Retry + Refresh/Back). 실패 시 수정 → 재배포 → 필요 범위만 재검증.

**F Production:** Preview Full E2E PASS 후 promote. Production에서도 Full E2E.

---

## 13. Evidence Requirement

최종 evidence 최소:

Implementation summary · Changed files · Local QA · Local Browser E2E · Preview URL/deploy · Preview Full E2E · Production URL/deploy · Production Full E2E · Session · Progression · Result/Rematch · 4-game · Desktop/Mobile · Failure/Retry · Contract regression · Final commit SHA

중간 evidence를 CEO에게 전달하지 않는다. Repository에 최종 evidence만.

Official path:

```text
docs/qa/cpo/mp-cpo-2nd-product-qa/live-service-95631/
├── qa-report.md
├── final-close.json
└── evidence/
```

---

## 14. CTO Final QA

전부 PASS일 때만 CTO FINAL QA = PASS:

Implementation · Local QA · Preview · Preview Full E2E · Production · Production Full E2E · Contract Regression · Session Foundation · Progression · Replay Loop · 4 Games · Desktop · Mobile

---

## 15. Final Report — 딱 1회

```text
WO 95631 CTO FINAL REPORT

Status: PASS / BLOCKED
Production: <URL / SHA>
Implementation: <핵심 변경 요약>
QA: Local / Preview / Production
Full E2E: Snake / Agar / Bomber / Re:Front
Session / Progression / Replay Loop / Desktop / Mobile 390
Product Contract: PASS
Evidence: docs/qa/cpo/mp-cpo-2nd-product-qa/live-service-95631/
Final Commit: <SHA>
CTO Final QA: PASS
```

이 보고 전에는 별도 보고하지 않는다.

---

## 16. Completion Gate

```text
Player Session Foundation      PASS
Progression Foundation         PASS
Character/Color extension      PASS
Result → Replay Loop           PASS
Catalog / Detail integration   PASS
Snake / Agar / Bomber / Re:Front PASS
Desktop / Mobile 390           PASS
Preview Full E2E               PASS
Production Full E2E            PASS
Product Contract               PASS
CTO Final QA                   PASS
```

그 후 `WO 95631 → CPO Product QA`.  
CPO Product QA 전까지 **WO 10742 시작 금지**.

---

## Armed — fire only after 84216 CLOSE

```text
EXECUTE NOW / DO NOT ASK FOR NEXT TASK

a0ce9b1 baseline 확인
→ WO 95631 OPEN
→ 약 3시간 자율 실행
→ 전체 QA/E2E
→ Preview
→ Production
→ Evidence
→ CTO Final QA
→ 최종 보고 1회
```

---

## Current gates

```text
WO 84216   🟡 OPEN · CPO Product QA pending
WO 95631   ⏸ QUEUED  Armed — do not execute
WO 10742   ⏸ QUEUED  after 95631 CPO Product QA
WO 12853   ⏸ QUEUED  after 10742 CLOSE
Production game29 / a0ce9b1
```
