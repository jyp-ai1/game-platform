# 🌙 Overnight Sprint (Closed Alpha Stabilization)

## 목표

**내일 아침까지 "싱글게임은 완성도 있게 즐길 수 있는 수준"으로 안정화한다.**

- 신규 게임 추가 ❌
- 신규 시스템 추가 ❌
- 멀티 신규 기능 ❌

**오직 안정화 / 연출 / QA / 운영 품질만 진행한다.**

---

## Priority 0 (무조건 완료)

### 1. Product Preview 배포 유지

Release Gate에서 FAIL이 있더라도 **Preview는 반드시 최신 상태 유지**

```
Commit
↓
Push
↓
Preview Deploy
↓
QA Report 생성
↓
다음 수정
↓
Preview 갱신
```

PM은 Product Preview에서만 확인한다. **Preview를 막지 않는다.**

---

### 2. 모든 싱글게임 안정화

오늘 정의한 Game Standard 기준 적용. **모든 Batch 완료 목표**

```
Bubble Pop
2048
Memory
Color Match

Tetris
Air Hockey
Sudoku
Minesweeper
...

나머지 싱글게임까지
```

각 게임은 반드시 아래 흐름이 정상 동작해야 한다.

```
START
↓
PLAY
↓
Stage
↓
GameOver
↓
Retry
↓
Exit
↓
Save
↓
Best Score
↓
Best Stage
```

---

## Game Standard (필수)

모든 싱글게임은 동일 UI가 아니라 **게임별 원작 규칙을 따른다.** 반드시 조사하여 적용.

각 게임은 아래 항목을 원작 기준으로 맞춘다.

| 항목 | 기준 |
| --- | --- |
| Rule | 원작과 동일 |
| Difficulty | 원작 수준 |
| Stage | 원작 기준 |
| Victory | 원작 기준 |
| Failure | 원작 기준 |
| Score | 원작 기준 |

---

## 추가 Standard (이번 Sprint부터 반드시 적용)

### Event Feedback

지금 대부분 게임은 성공 · 실패 · 획득 · 파괴에 **아무 느낌이 없다.**

원작 수준의 가벼운 Feedback 추가. **과하지 않게.** "손맛" 위주.

| 게임 | 예시 |
| --- | --- |
| Bubble Pop | Bubble Pop 애니메이션 · Particle · Pop Effect · Combo 느낌 |
| 2048 | Tile Merge Animation · Scale Pop |
| Memory | Card Flip · Match Spark |
| Color Match | Correct Flash · Combo Pulse |
| Air Hockey | Goal Flash · Camera Punch · Goal Sound |
| Tetris | Line Clear Flash · Soft Shake |

---

### Sound Standard

모든 싱글게임 — 최소 사운드 적용. **기본 ON**, 설정에서 OFF 가능.

```
Start · Button · Success · Fail · Combo · GameOver · Stage Clear
```

---

### Progress Standard

모든 게임 — 반드시 저장

```
Best Score · Best Stage · Play Count · Retry Count · Best Time
```

---

### Difficulty

게임마다 별도. **공통 적용 금지.** 반드시 원작 조사.

---

## QA

게임별 자동 QA + 실제 플레이 확인

```
START · PLAY · CLEAR · FAIL · RETRY · EXIT · SAVE
```

---

## Release Policy

밤새 작업 루프:

```
Commit → Push → Preview → QA → Fix → Preview → Repeat
```

**아침에는 가장 최신 Preview만 전달**

---

## Multiplayer (이번 Sprint)

**신규 기능 금지**

Snake — 운영 안정화만:

- Quit · Camera · Rotation · Mobile · FPS · Memory Leak · Reconnect

Diep.io — `SOON` 유지 · **개발 금지**

---

## Deliverables (아침까지)

아침까지 반드시 제출:

### 1. Batch별 QA Report

```
PASS · FAIL · WARN
```

### 2. Game Health Dashboard 업데이트

### 3. Preview URL (최신 Preview)

### 4. Known Issues (남은 이슈 · 우선순위)

### 5. Closed Alpha Ready 여부

```
READY  or  NOT READY
```

---

## 가장 중요한 원칙

> **"게임을 만드는 것"이 아니라 "지인들에게 자신 있게 공개할 수 있는 서비스"를 만드는 것을 목표로 한다.**

이번 스프린트에서는 **완성도, 안정성, 원작의 손맛, 피드백(이펙트·사운드), QA**가 모든 신규 기능보다 우선입니다.

---

# Sprint 13.6 — Platform Stabilization (Cursor 작업지시)

**Gate:** Game Standard → Batch QA → Preview → PM

## STEP 1 — 플랫폼 기준 ✅

- [x] `game-standard.ts` + `game-session.ts`
- [x] `game-progress.ts` + `recordGameEnd` alias
- [x] `docs/game-standard.md`
- [x] `docs/game-rules/*` (8 games + taxonomy)
- [x] `/admin/game-health` dashboard
- [x] `tools/qa/run-release-gate.mjs`

## STEP 2 — Batch 1 (게임별 QA→수정→PASS)

| Game | QA | Fix | PASS |
| --- | --- | --- | --- |
| bubble-pop | FAIL | stage + session · 409 console | ☐ |
| 2048 | FAIL | continue + timeout E2E | ☐ |
| memory | FAIL | stages · false-win · timeout E2E | ☐ |
| color-match | FAIL | session · 409 console | ☐ |

## STEP 3 — Batch 2+ (Overnight)

| Game | QA | Fix | PASS |
| --- | --- | --- | --- |
| tetris | WARN | | ☐ |
| air-hockey | WARN | | ☐ |
| sudoku | — | | ☐ |
| minesweeper | — | | ☐ |

## Release Policy (Overnight)

```
Commit → Push → Preview (항상 유지) → QA → Fix → Preview → Repeat
```

Release Gate FAIL이어도 **Preview 배포는 중단하지 않는다.** PM은 Preview URL에서만 확인.

## Release Gate (참고 — Preview 차단 아님)

Rule → Stage → Retry → Save → Score → QA

## Snake / Multiplayer

- 신규 기능 중단 · 안정화만
- Diep.io: SOON (개발 금지)

## 최신 QA 스냅샷 (2026-07-28)

```
Workspace Typecheck  PASS (exit 0)
Build                PASS
Batch1 QA            ALL FAIL (409 console · 2048/memory timeout)
Preview              BLOCKED until commit/push
```

Report: `docs/reports/full-loop/2026-07-28/`
