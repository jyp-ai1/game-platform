# WO 10742 — Re:Play Growth & Player Progression

```text
QUEUED — DO NOT EXECUTE UNTIL PREDECESSORS COMPLETE
선행: WO 95631 CPO Product QA PASS → CLOSE
구현 없음 · Preview 없음 · Production 작업 없음
Baseline: 95631 Production 최종 SHA (실행 시 재확인)
Vercel: game29
Repo: jyp-ai1/game-platform
Branch: promote/product-catalog
규모: 약 3~5시간 Long Sprint — 짧은 기능 Sprint 아님
```

> ## 🔴 EXECUTION RULE — 최우선
>
> **이 작업은 약 3~5시간 규모의 장기 자율 실행 Work Package다.**
>
> 작업을 받은 뒤 **중간에 CPO/CEO에게 묻지 말고 끝까지 실행한다.**
>
> 금지: 중간 검토 · 범위 확인 · 중간 진행보고 · 부분 QA 보고 · “다음 작업을 주세요” · CEO 테스트 요청 · 작은 Sprint 분할 · 구현 후 즉시 보고
>
> 전체 제품 범위를 스스로 판단하고 `구현 → 통합 → QA → E2E → 수정 → Preview → Production → Evidence → CTO Final QA`까지 완료한 후 최종 보고 1회만 한다.
>
> 중단은 `P0 / Product Contract 파괴 / 비가역적 아키텍처 / 제품 정책 / 신규 게임 / STEP4 변경`만. 그 외는 CTO가 합리적으로 결정하고 계속 진행한다.

---

# 1. 실행 Gate

**WO 95631 CPO Product QA PASS 및 CLOSE 이후에만 실행.**

```text
95631 CLOSE
↓
Production baseline 실제 확인
↓
10742 OPEN
↓
전체 Long Sprint 실행
```

```text
Repository: jyp-ai1/game-platform
Branch: promote/product-catalog
Vercel: game29
```

Legacy Vercel `game-platform` 사용 금지.

---

# 2. 제품 목표

짧은 기능이 아니라 **실제 플레이어 성장 루프 전체**를 한 번에 만든다.

```text
PLAY → RESULT → PLAYER PROGRESS → REWARD / UNLOCK
→ CHARACTER / PLAY → RESULT → 다시 성장
```

**게임 플레이 → 결과 → 누적 → 보상/해금 → 다음 플레이**가 실제 Product Experience로 이어져야 한다.

---

# 3. Player Profile

게임을 계속 플레이할 이유가 보이는 최소 Profile.

* player identity
* total play count
* game별 play count
* win/loss 또는 게임별 result summary
* 최근 결과
* progression 상태
* mileage
* character unlock 상태

과도한 SNS/Profile 금지.

---

# 4. Match / Result History

각 플레이 결과 최소: Game · Result · Win/Loss/Outcome · Timestamp 또는 순서.

필수: 최근 플레이 기록 · 게임별 결과 · 중복 기록 방지 · Refresh 후 유지 · 재로그인/재진입과 충돌하지 않는 state.

95631 Session Foundation 재사용.

---

# 5. Mileage / Progression

핵심: 실제 플레이로 progression이 증가.

```text
Play → Mileage 증가 → Progress 상태 변화
```

```text
Mileage
├─ current
├─ threshold
└─ future reward extension
```

거대한 경제 시스템 금지. 게임별 보상 계산은 단순하게.

---

# 6. Character Unlock

`Character → Color → ENTER` 유지. **적어도 하나의 실제 Unlock 사례를 완성.**

```text
Character A → 기본 사용 가능
Character B → Locked
플레이 / Mileage → Unlock 조건 달성
Character B → Unlocked → 선택 → Color → ENTER
```

Unlock 조건은 단순·명확. 상점/가챠/인벤토리 금지.

---

# 7. Progress → Reward → Play Loop

Profile과 Character를 별개 페이지로 끝내지 않는다.

```text
GAMEPLAY → RESULT → PROGRESS → MILEAGE / REWARD
→ CHARACTER UNLOCK → PLAY AGAIN
```

다음 플레이 이유가 UI에서 이해되어야 한다.

---

# 8. Result Hub Integration

```text
Result
├─ REMATCH
├─ ANOTHER GAME
├─ PROGRESS
└─ EXIT
```

`Result → Progress → Play` 이동이 끊기지 않게.

---

# 9. Catalog / Detail Integration

필요 시 최소 UI: 플레이한 게임 · 진행 상태 · 플레이 횟수 · 최근 결과 · Unlock 상태 · 다시 플레이 CTA.

Catalog를 Dashboard로 바꾸지 않는다. **게임 선택이 항상 가장 중요한 행동.**

---

# 10. 4개 공식 게임 전체 통합

같은 progression contract: Snake · Agar · Bomber · Re:Front

**Snake:** gameplay result · play count · history · progression · mileage · rematch · character

**Agar:** Host/Guest result · play count · history · progression · mileage · rematch · character

**Bomber:** Host/Guest · win/loss 또는 outcome · play count · history · progression · mileage · rematch · character

**Re:Front:** 엔진 보존 · result/progression/mileage/rematch/character 연결. **STEP4 및 엔진 대규모 변경 금지.**

---

# 11. Product Contract 절대 보호

```text
NO Solo
NO PRACTICE
NO fallback=1
NO BOMBER-SOLO
NO silent Solo fallback
NO infinite Connecting
NO Exit → Home
NO Another Game → generic /games
NO Bomber Map Select
NO STEP4 regression
```

공통 흐름 유지: Catalog → Detail → Character → Color → ENTER → Connecting → Multiplayer World → Gameplay → Result

---

# 12. Desktop / Mobile

```text
Desktop + Mobile 390px
```

특히 Result · Progress · Character · Unlock · Catalog · Detail · Rematch · Exit.

---

# 13. Session / Data Integrity

```text
Play → Result → Save Result → Update Progress → Unlock Check → Replay
```

깨지면 안 되는 경우: Refresh · Back · Rematch · repeated Rematch · join failure · reconnect · stale room · 게임 종료 · 다른 게임 이동 · 같은 게임 재진입 · 빠른 double-click.

**결과/mileage 이중 기록 방지.**

---

# 14. Full Product E2E

```text
Catalog → Detail → Character → Color → ENTER → Multiplayer
→ Gameplay → Result → Progress → Rematch → Gameplay → Result
→ Another Game → 다른 게임 Multiplayer → Exit → Detail
```

```text
Progress → Character → Unlock 확인 → Play
```

Desktop · Mobile 390 · Host/Guest · Refresh · Back · double-click · join failure · Retry · reconnect · stale session · repeated Rematch · result / progression / unlock integrity.

---

# 15. Token Efficiency

1. 95631 evidence부터 읽는다.
2. PASS 코드 전체 재독 금지.
3. 변경 대상 파일을 먼저 찾는다.
4. Session/Result 구조 재사용.
5. 기존 QA 증거 재사용.
6. 영향 없는 게임 전체 재QA 금지.
7. 실패 영역만 집중.
8. 반복 검색 최소화.
9. broad refactor 금지.
10. shared SDK 전체 rewrite 금지.
11. 최소 파일/최소 코드.
12. 중간 보고 금지.

---

# 16. QA Pipeline

```text
Existing Evidence → Implementation → Local QA → Browser E2E → Fix
→ Regression → Preview Deploy → Preview Full E2E → Fix / Regression
→ Production Promote → Production Full E2E → Evidence → CTO Final QA
```

중간에 멈춰서 보고하지 않는다.

---

# 17. Final Acceptance

전부 PASS + `CTO FINAL QA = PASS`:

Player Profile · Match/Result History · Play Count · Progression · Mileage · Character Unlock · Result Hub · Replay Loop · Catalog · Detail · Snake · Agar · Bomber · Re:Front · Desktop · Mobile 390 · Session Integrity · Data Integrity · Product Contract · Preview Full E2E · Production Full E2E

---

# 18. Evidence

```text
docs/qa/cpo/mp-cpo-2nd-product-qa/growth-10742/
├── qa-report.md
├── final-close.json
└── evidence/
```

implementation summary · changed files · Profile · Result History · Progression · Mileage · Character Unlock · 4-game · Desktop/Mobile · Preview · Production · Full E2E · regression · final SHA · CTO Final QA

---

# 19. 최종 보고 — 1회

```text
WO 10742 — CTO FINAL REPORT

Status: PASS / BLOCKED
Production: <URL> <SHA>
Profile / Result History / Progression / Mileage / Character Unlock
Result Hub / Replay Loop
Snake / Agar / Bomber / Re:Front
Desktop / Mobile 390
Preview Full E2E / Production Full E2E
Product Contract: PASS
Evidence: docs/qa/cpo/mp-cpo-2nd-product-qa/growth-10742/
Final Commit: <SHA>
CTO Final QA: PASS
```

이 보고 이전에는 CPO/CEO에게 확인 요청이나 중간 보고를 하지 않는다.

---

# 20. 다음 Gate

```text
10742 완료 + CTO Final QA PASS
↓
CPO Product QA
↓
10742 CLOSE
↓
WO 12853 OPEN
```

그 전에는 12853을 실행하지 않는다.

---

## Armed — fire only after 95631 CPO CLOSE

확인 종료 (`5bfeb2d`). CLOSE 후 범위 재질문 · 확인 요청 금지.

```text
EXECUTE NOW / DO NOT ASK FOR NEXT TASK

95631 Production SHA 확인
→ WO 10742 OPEN
→ 약 3~5시간 Growth + Progression 전체 자율 실행
→ 구현 → 통합 → Local QA → E2E → 수정 → Regression
→ Preview → Production → Full E2E → Evidence → CTO Final QA
→ 최종 보고 1회
```
