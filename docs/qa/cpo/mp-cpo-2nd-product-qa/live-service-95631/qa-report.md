# CTO WORK ORDER — WO 95631

## Re:Play Live Service Foundation

```text
QUEUED — DO NOT EXECUTE UNTIL PREDECESSORS COMPLETE
선행: WO 84216 CPO Product PASS → CLOSE
구현 없음 · Preview 없음 · Production 작업 없음
Baseline 예정: game29 a0ce9b1
Vercel: game29
Repo: jyp-ai1/game-platform
Branch: promote/product-catalog
```

> ## 🔴 최우선 운영 규칙
>
> **이 작업은 약 3시간 단위의 Long Sprint로 자율 실행한다.**
>
> 작업을 받은 즉시 스스로 판단하여 전체 범위를 진행한다.
>
> **중간 검토 요청 금지.**
> **중간 진행보고 금지.**
> **“다음 작업을 달라”는 요청 금지.**
> **CEO/CPO에게 중간 테스트 요청 금지.**
>
> `분석 → 구현 → 통합 → Local QA → Browser E2E → 수정 → Regression → Preview → Preview Full E2E → Production → Production Full E2E → Evidence → CTO Final QA`
>
> 위 전체 사이클을 **한 번의 작업 단위로 끝까지 수행한 뒤 최종 보고 1회만 한다.**
>
> P0 / Product Contract 파괴 / 비가역적 아키텍처 결정 / 제품 정책 결정 / 신규 게임 / STEP4 변경 외에는 에스컬레이션하지 말고 CTO가 합리적으로 결정하여 계속 진행한다.

---

# 1. 실행 조건

```text
WO 84216
CPO Product QA
    ↓
84216 CLOSE
    ↓
Production baseline 확인
    ↓
WO 95631 실행
```

**95631은 84216 CLOSE 전까지 구현하지 않는다.**

실행 시작 시 실제 Repository evidence로 Production baseline을 재확인한다.

```text
Repository: jyp-ai1/game-platform
Branch: promote/product-catalog
Vercel Project: game29
Expected Production baseline: a0ce9b1
```

Legacy Vercel `game-platform`은 사용하지 않는다.

---

# 2. Token 절약 원칙

- 기존 QA evidence를 먼저 읽는다.
- 변경 대상 파일을 먼저 분석한다.
- PASS된 전체 코드베이스를 다시 읽지 않는다.
- 영향 없는 게임을 전체 재테스트하지 않는다.
- 기존 PASS evidence를 재사용한다.
- 같은 검색을 반복하지 않는다.
- 같은 테스트를 이유 없이 반복하지 않는다.
- 실패한 영역만 집중 분석한다.
- 최소 파일 / 최소 코드 변경.
- broad refactor 금지.
- 불필요한 shared SDK rewrite 금지.
- 기존 구조를 최대한 활용한다.
- 중간 산출물 보고서를 만들지 않는다.
- 최종 evidence를 한 번에 정리한다.

---

# 3. Sprint 목표

> **게임을 한 번 실행하고 끝나는 Product가 아니라, 플레이 → 결과 → 재플레이 → 진행 → 다음 게임으로 이어지는 Live Service Foundation**

```text
Player Session
Progression Foundation
Character / Color Extension
Result → Replay Loop
Catalog / Detail Integration
4 Games Stability
```

---

# 4. Player Session Foundation

필수 흐름:

```text
Catalog → Detail → Character → Color → ENTER
→ Connecting → Multiplayer World → Gameplay → Result
```

Result 이후:

```text
REMATCH        → 같은 게임 재진입
ANOTHER GAME   → 다른 공식 게임
EXIT           → 해당 게임 Detail
```

검증/수정: 정상 입장 · 정상 종료 · Result · Rematch · 재입장 · Refresh · Back · ENTER double-click · stale room · join failure · reconnect · cleanup · 중복 세션 · 종료 후 잔존 state · Result 이후 stale state.

**UI상으로는 게임을 나갔지만 실제 session/room state가 남아 있는 문제를 방지한다.**

---

# 5. Progression Foundation

거대한 RPG를 만들지 않는다. 최소 플레이 기록 기반만.

```text
play count
result history
win/loss 또는 game-specific result
recent play state
future mileage extension point
future character unlock extension point
```

```text
게임 플레이 → 결과 기록 → 누적 플레이 상태 → 다음 플레이에서 재사용 가능한 기반
```

과도한 경제 / 인벤토리 / RPG 금지.

---

# 6. Character / Color Extension

현재 UX를 깨지 않는다. `Character → Color → ENTER`

현재 선택 가능한 캐릭터/색상은 기존처럼 정상 동작.

구조만:

```text
Character  unlocked / locked
Color      available / future unlock extension
```

필요 이상의 Unlock UI 금지.

---

# 7. Result → Replay Loop

```text
Gameplay → Result
  ├─ REMATCH      → Gameplay
  ├─ ANOTHER GAME → 다른 공식 게임
  ├─ Progress     → 최소 진행 정보
  └─ EXIT         → 해당 게임 Detail
```

검증: Rematch 후 실제 gameplay 재진입 · 새 session 생성/정리 · 이전 Result가 새 게임에 남지 않음 · play count 중복 증가 방지 · win/loss 중복 기록 방지 · Another Game 이후 올바른 Detail/MP 진입 · Exit 이후 해당 게임 Detail 복귀.

---

# 8. Catalog / Detail

공식 4게임: Snake · Agar · Bomber · Re:Front

유지: thumbnail · hero · title · one-line · multiplayer 정보 · gameplay features · 명확한 CTA

공식 `/play`와 Discover `/games`를 섞지 않는다.

---

# 9. Snake

```text
Multiplayer Entry → Gameplay → Result → Rematch → Gameplay → Result → Progression
```

추가: mobile controls · HUD · refresh · back · session cleanup · repeated rematch. 기존 Snake Contract 회귀 금지.

---

# 10. Agar

```text
Host ↔ Guest → Multiplayer → Gameplay → Result → Rematch → Progression
```

추가: join failure · Host reclaim · reconnect · refresh · back · session cleanup · mobile. 기존 MP recovery 보존.

---

# 11. Bomber

```text
Multiplayer Entry → Host / Guest → Gameplay → Death / Win-Loss → Result → Rematch → Progression
```

추가: shard/session stability · join failure · Retry · Back · reconnect · stale session · cleanup · mobile.

```text
NO BOMBER-SOLO
NO Solo fallback
NO Map Select
```

---

# 12. Re:Front

**엔진 재작성 금지. STEP4 변경 금지.**

```text
Existing Engine → Multiplayer Session → Gameplay → Result → Progression → Rematch
```

최소 integration만.

---

# 13. 절대 Product Contract

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

MP failure = Retry / Back.

---

# 14. Full E2E

기본 루프:

```text
Catalog → Detail → Character → Color → ENTER → Multiplayer World
→ real Gameplay → Result → REMATCH → Gameplay → Result
→ ANOTHER GAME → another game Multiplayer → EXIT → Detail
```

추가: Desktop · Mobile 390 · Host/Guest · Refresh · Back · ENTER double-click · join failure · Retry · reconnect · stale session · repeated Rematch · session cleanup · result integrity · progression integrity.

이미 PASS인 영역은 기존 evidence 재사용. **이번 변경 영향 영역을 우선 검증.**

---

# 15. QA Pipeline

**Phase 1 — Evidence Review:** 84216 · 기존 CPO/CTO QA · Product Contract · 95631 문서 · 영향 파일. 전체 repository 재독 금지.

**Phase 2 — Implementation 우선순위:** 1 Session · 2 Result/Replay · 3 Progression · 4 Character extension · 5 Catalog/Detail · 6 4-game integration.

**Phase 3 — Local QA:** typecheck · build · 영향 영역 QA · Browser E2E · 4-game critical path. 실패 시 즉시 수정.

**Phase 4 — Regression:** 변경 영향 영역만. 영향 없는 PASS 전체 재검증 금지.

**Phase 5 — Preview:** 4 Games · Desktop · Mobile 390 · Session · Gameplay · Result · Rematch · Another Game · Exit · Refresh · Back · Failure/Retry · Reconnect. 실패 시 수정 → 재배포 → 필요 범위 재검증.

**Phase 6 — Production:** Preview Full E2E PASS 후 promote. Production에서 다시 Full E2E.

---

# 16. Evidence

Official path:

```text
docs/qa/cpo/mp-cpo-2nd-product-qa/live-service-95631/
├── qa-report.md
├── final-close.json
└── evidence/
```

최종 evidence: Implementation · Changed files · Local QA · Local Browser E2E · Preview deploy · Preview Full E2E · Production deploy · Production Full E2E · Session · Progression · Result/Replay · 4-game · Desktop · Mobile 390 · Failure/Retry · Contract regression · Final commit SHA · CTO Final QA.

---

# 17. CTO Final QA

전부 PASS일 때만 `CTO FINAL QA = PASS`:

Implementation · Local QA · Preview · Preview Full E2E · Production · Production Full E2E · Session · Progression · Character Extension · Replay Loop · Snake · Agar · Bomber · Re:Front · Desktop · Mobile 390 · Product Contract

---

# 18. 최종 보고 — 1회

```text
WO 95631 — CTO FINAL REPORT

Status: PASS / BLOCKED
Production: <URL> <SHA>
Implementation: <핵심 변경>
Local QA / Preview / Preview Full E2E / Production / Production Full E2E
Session / Progression / Character Extension / Replay Loop
Snake / Agar / Bomber / Re:Front
Desktop / Mobile 390
Product Contract: PASS
Evidence: docs/qa/cpo/mp-cpo-2nd-product-qa/live-service-95631/
Final Commit: <SHA>
CTO Final QA: PASS
```

이 최종 보고 전에는 어떤 형태의 중간 보고도 하지 않는다.

---

# 19. 다음 단계 Gate

CTO Final QA PASS 이후에만 `WO 95631 → CPO Product QA`.  
CPO Product QA가 끝나기 전에는 **WO 10742를 실행하지 않는다.**

---

## Armed — fire only after 84216 CLOSE

```text
EXECUTE NOW / DO NOT ASK FOR NEXT TASK

a0ce9b1 baseline 확인
→ WO 95631 OPEN
→ 약 3시간 자율 실행
→ 전체 QA/E2E → Preview → Production → Evidence → CTO Final QA
→ 최종 보고 1회
```
