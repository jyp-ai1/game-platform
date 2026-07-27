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

## Sprint 7 — Gameplay Feel ✅ (in progress)

| ID | Item | Spec |
|----|------|------|
| P0-1 | Camera lerp | 0.12–0.18, no snap, no shake |
| P0-1 | Boost zoom | Smooth 5% zoom out, restore on release |
| P0-2 | Base zoom | 1.3–1.5× (`baseCameraZoom: 1.4`) |
| P0-3 | Full screen | ⛶ button, `requestFullscreen()` + mobile |

---

## Sprint 8 — Character System

- 입장 전 캐릭터 선택 (🐸🐼🦊🐱🐶🐧🐵🦈👽🤖)
- Head sprite only; body 동일; 죽어도 유지
- 귀여운 SD 스타일

---

## Sprint 9 — Profile / Progression

- 로그인 → Lv.1 Rookie Worm
- EXP → Level (Egg → Larva → … → Replay Master @ Lv100)
- 레벨업 시 테두리 / 닉네임 색 / 칭호 해금

---

## Sprint 10 — Season Themes

- 🍕 Pizza / 🎄 Christmas / 👻 Halloween 등
- 먹이 스킨 + 맵 분위기

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
