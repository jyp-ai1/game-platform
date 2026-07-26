# Sprint: Playtest Sprint #1

> **유일한 승인 작업:** Playtest #1~#10 수집 + 매 스프린트 숫자 하나만 조정  
> **코드 작성 금지** — QA·수치 튜닝만  
> **전제:** Stage 1 + Stage 1-1 (Living World) PASS 후 시작. Stage 1 PASS 전까지 새 기능 개발 금지.

---

## Gate 순서 (Playtest 전)

```
Stage 0 Platform  ✅ PASS
Stage 1 Entry     ← PM 실기기 (Canvas · in-game)
Stage 1-1 Living  ← 30초 idle · Kill Feed · BOT 교전 · TOP10 변화
Stage 2 Gameplay
Stage 3 Retention
→ Playtest Sprint
```

## 스프린트 루프 (2~3주)

```
Sprint 1  Playtest
Sprint 2  Fix (숫자 1개)
Sprint 3  Playtest
Sprint 4  Fix
```

플레이 루프:

```
Play → Observe → One Number Change → Play
```

---

## Observation Sheet

### 재미 꺾임 (가장 중요)

**언제?**
- 10초 / 30초 / 1분 / 3분 / 끝까지 안깨짐

**왜?**
- 먹이 없음 / 사람 없음 / 너무 쉬움 / 너무 어려움 / 죽고 재미없음 / 목표 없음 / 기타

### 죽은 후 3초
- Exit / Replay / Spectator / **Invite** ← 친구 플랫폼 KPI

---

## Stranger Test

모르는 사람 2명 · 같은 WORLD · 10분 · **말 안 시킴**

질문:

> 저 사람 — 사람 같았어? BOT 같았어?

```javascript
PlaytestObservation.stranger.append({
  observer: "PM",
  targetLabel: "옆자리 플레이어",
  thoughtHuman: true,
})
```

---

## Blind Test

Slither 30분 vs Replay 30분 → **"어느 쪽을 한 판 더?"** (이유 금지)

---

## Playtest Report (10개 쌓이면)

```javascript
PlaytestReport.generate()
```

```
Replay Playtest Report

😊 웃음          72%
😡 바로 종료      18%
🔥 한 판 더       64%
👥 친구 초대      21%
🤖 BOT 사람 판정  58%
😄 재밌었다       55%

재미 꺾임 #1 이유: 사람이 없는 느낌 (4회)
```

---

## 콘솔 예시

```javascript
PlaytestObservation.append({
  playerLabel: "친구 #2",
  segment: "non_gamer",
  observer: "PM",
  playMin: 10,
  movedImmediately: true,
  focusAt30s: "food",
  funBreak: { at: "1min", why: "empty" },
  firstDeath: { laughed: false, spectated: true },
  invitedFriendWithin3s: false,
  pressedOneMoreSelf: true,
  saidFun: true,
})

PlaytestLog.append({ fixes: ["directionJitter +5%"] })
PlaytestReport.generate()
PlaytestLog.gates()
```

---

## Playtest 대상 순서

1. 본인 10판  
2. 개발자 2명  
3. 게임 안 하는 친구 5명  
4. 중학생  
5. 초등학생  

---

## 완료 조건

- [ ] Observation Sheet 10개
- [ ] Playtest Log 10개  
- [ ] `PlaytestReport.generate()` 1회 이상
- [ ] Stranger Test 5회+
- [ ] 수치 튜닝 1개 적용 후 재플레이

완료 후 → **"어떤 숫자 하나가 리매치율을 가장 크게 올리는지"** PM 분석
