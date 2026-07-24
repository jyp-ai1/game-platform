# Game Selection Criteria — Re:Play

**확정일:** 2026-07-24 (PM Review 반영)  
**적용:** Sprint 13+ — **Game Package 출시** 기준

---

## 선정 기준 (7항목 · 전부 PASS)

| 항목 | 기준 |
| --- | --- |
| **플레이 시간** | 2~5분 (한 판) |
| **조작** | 1~3 입력 (키보드/터치) |
| **규칙** | 10초 안에 이해 |
| **저장** | 이어하기 (`game-sdk` save) |
| **랭킹** | 점수 경쟁 (`ranking_submit`) |
| **반복성** | "한 판만 더" 유도 |
| **모바일** | 터치 자연스러움 |

---

## Sprint별 출시 로드맵 (PM 확정)

### Sprint 13 ★★★★★

| # | Game | Category |
| --- | --- | --- |
| 1 | **Pinball** | Arcade |
| 2 | **Connect4** | Board |
| 3 | **Water Sort** | Puzzle |
| 4 | **Mahjong** | Puzzle |

### Sprint 14

Solitaire · FreeCell · Chess

### Sprint 15

Bomberman · Pac-Man · Duck Hunt

### Sprint 16

Typing · Word Search · Hangman (variant — repo 기존 hangman과 구분)

---

## Game Package 출시 체크list

**「추가」가 아니라 「출시」** — 1종 완료 시 전부 체크:

- [ ] 선정 기준 7항목 PASS
- [ ] `games/<slug>` · `PLAYABLE_SLUGS` · `game-player.tsx`
- [ ] save/resume · score → ranking
- [ ] XP / Season / Daily·Weekly mission hooks
- [ ] 썸네일 · 스크린샷 · Supabase `games` + category
- [ ] SEO (metadata · JSON-LD · sitemap)
- [ ] CMS event / featured (출시 주)
- [ ] **NEW** 배지 7일 · **첫 플레이 XP 2×**
- [ ] Game Analytics (Play · Finish · Retry · Quit · Resume · Favorite)
- [ ] **Review Card** · **운영 가이드** ([`templates/game-package-template.md`](./templates/game-package-template.md) — **19 items**)
- [ ] Enhanced QA (3min · 10min · 30 restart · refresh · network)
- [ ] 모바일 375px QA

---

## Backlog (후순위)

Zuma · Nonogram · Picross · Hexa Puzzle · Color Sort · Idle Clicker · Checkers · …

---

## 제외

- 10분+ 필수 플레이 · 복잡 튜토리얼 · 랭킹 불가 · 터치 미지원 · IP 라이선스 불명

---

## PM Note

Sprint 13 = Pinball · Connect4 · Water Sort · Mahjong — **출시 패키지 4종**.
