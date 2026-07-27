# Replay Snake — Product Roadmap

> Slither.io를 그대로 따라가기보다 **Replay만의 재미 요소**를 쌓는 방향.
> 각 스프린트는 **완전히 안정화된 뒤** 다음 단계로 진행.

## Development Order

1. **Gameplay Feel** — 조작감, 카메라, 줌
2. **Character** — 선택 가능한 머리 캐릭터
3. **Progression** — 레벨, 프로필, 칭호
4. **Social** — 친구, 파티
5. **Replay 고유 기능** — Instant Replay, 공유, 하이라이트

---

## Sprint 7 — Gameplay Feel ✅ (deployed)

| ID | Item | Spec |
|----|------|------|
| P0-1 | Camera lerp | 0.15, no snap, no shake |
| P0-1 | Boost zoom | Smooth 5% CSS scale (camera decoupled) |
| P0-2 | Base zoom | `baseCameraZoom: 1.4` |
| P0-3 | Full screen | ⛶ button |

---

## Sprint 7.1 — QA Gate ⏳ (current)

**Sprint 8 blocked until all checklist items PASS on Preview.**

Checklist: [`docs/sprint-replay-snake-7.1-qa.md`](./sprint-replay-snake-7.1-qa.md)

### Gate rule

> New features **only after** previous sprint QA is all PASS.  
> Any FAIL → stop features, fix, redeploy, re-test.

---

## Sprint 8 — Character System (blocked)

**Animals:** 🐸 Frog · 🐱 Cat · 🐶 Dog · 🐼 Panda · 🦊 Fox  
**Fantasy:** 🤖 Robot · 👽 Alien · 👻 Ghost · 🐉 Dragon · 😈 Devil

Head sprite only · body shared · persists after death · SD style · select before START

---

## Sprint 9 — Replay Progression (blocked)

Lv1 알 → Lv5 애벌레 → Lv10 꿈틀이 → Lv20 탐험가 → Lv30 사냥꾼 → Lv50 챔피언 → Lv80 전설 → Lv100 Replay Master

프로필 테두리 · 닉네임 색 · 칭호 해금

---

## Sprint 10 — Instant Replay (blocked)

Death → Killed by Player123 → ▶ 마지막 5초 보기 → Share Replay

---

## Sprint 11 — Friends & Party

- Invite → Join Party → same WORLD
- Party outline (blue), minimap friend dots

---

## Sprint 12 — Replay Differentiation

- Death → 🎬 Instant Replay (5s auto)
- Share Replay, "Killed by Player123"

---

## Backlog

### Gameplay
- 보석 흡입 애니메이션 강화
- 사망 이펙트 개선
- 성장 애니메이션 강화
- 날씨 연출 (비, 눈, 밤)

### Character
- 10종 머리, 선택 UI, 해금, 감정 표현

### Progression
- 배지, 시즌 패스 (추후)

### Social
- 클랜, 관전

### Replay Platform
- 베스트 플레이 저장, 하이라이트 자동 생성, 친구 기록 비교, 월간 랭킹
