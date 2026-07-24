# Game Operation Guide — Template

**적용:** Sprint 13+ — Game Package 출시 시 **게임마다 1개** 작성  
**위치:** `docs/games/{slug}-operation-guide.md`  
**템플릿:** [`templates/game-package-template.md`](./templates/game-package-template.md)

---

## 목적

운영자가 **개발자 없이** 게임을 관리·장애 대응·비활성화할 수 있도록, 게임별 운영 정보를 문서화합니다.

---

## 작성 시점

Game Package T1~T4 완료 직전 — **출시 GA 전 필수**

---

## Template (복사하여 사용)

```markdown
# {Game Name} — Operation Guide

**Slug:** `{slug}`  
**Category:** {category}  
**Released:** {YYYY-MM-DD}  
**PM Owner:** ___________

---

## 1. 추천 대상

| 항목 | 내용 |
| --- | --- |
| 연령/취향 | e.g. 캐주얼 · 퍼즐 좋아하는 유저 |
| 플레이 시간 | e.g. 2~5분 |
| 난이도 | ★★★☆☆ |
| 모바일 적합 | Yes / No |
| PM 추천 | ★★★★★ |

---

## 2. 운영 방법

### 홈 노출

- NEW 배지: 출시 후 7일 (`released_at` 기준)
- Featured: `/admin/cms` → Featured Games
- Launch Event: `/admin/cms` → Events

### 미션 연동

- Daily: {slug} 플레이 N회
- Weekly: {slug} 점수 N점

### CMS 등록 체크

- [ ] Banner (선택)
- [ ] Notice (선택)
- [ ] Event (출시 주)
- [ ] Featured slot
- [ ] Visibility = Public

---

## 3. 버그 발생 시

| Severity | 증상 | 1차 조치 |
| --- | --- | --- |
| P0 | 게임 로드 불가 · 점수 미저장 | Feature Flag OFF → Maintenance |
| P1 | 모바일 터치 오류 · 랭킹 미표시 | Maintenance + PM 알림 |
| P2 | UI 깨짐 · 사운드 | 다음 스프린트 fix |

**에스컬레이션:** [`incident-runbook.md`](./incident-runbook.md)

---

## 4. 비활성화 방법 (개발자 없이)

### 방법 A — CMS Visibility

1. `/admin/cms/visibility` 로그인
2. `{slug}` → **Maintenance** 또는 **Hidden**
3. 저장 → 홈/카테고리에서 즉시 반영 (revalidate)

### 방법 B — Feature Flag

1. `/admin/flags`
2. `game_{slug}_enabled` 또는 `beta_games` OFF
3. 저장

### 방법 C — 긴급 (S1)

Vercel rollback — [`rollback-guide.md`](./rollback-guide.md)

---

## 5. Feature Flag

| Flag | Default | 용도 |
| --- | --- | --- |
| `game_{slug}_enabled` | ON | 게임 단독 ON/OFF |
| `ranking_enabled` | ON | 랭킹 제출 |
| `save_enabled` | ON | 저장/이어하기 |
| `launch_xp_boost` | ON | 첫 플레이 XP 2× |

---

## 6. 점검 방법

| Check | How | Expected |
| --- | --- | --- |
| Load | `GET /games/{slug}` | 200 · GamePlayer 표시 |
| Play | 1판 플레이 | 점수 표시 |
| Save | 중간 저장 → 새로고침 | Resume |
| Ranking | 점수 제출 | 리더보드 반영 |
| Mobile | 375px DevTools | 터치 playable |
| Analytics | `/admin/analytics` | Play 이벤트 증가 |
| Errors | `/admin/errors` | 0 new P0 |

---

## 7. 관련 문서

- Review Card: [`../game-review-card.md`](../game-review-card.md)
- Package: [`templates/game-package-template.md`](./templates/game-package-template.md)
- Operator Manual: [`operator-manual.md`](./operator-manual.md)
```

---

## Sprint 13 예정 (placeholder)

| Game | Guide Path | Status |
| --- | --- | --- |
| Pinball | `docs/games/pinball-operation-guide.md` | Pending kickoff |
| Connect4 | `docs/games/connect4-operation-guide.md` | Pending |
| Water Sort | `docs/games/water-sort-operation-guide.md` | Pending |
| Mahjong | `docs/games/mahjong-operation-guide.md` | Pending |

---

## PM Note

**출시 패키지 19개** 중 **운영 가이드** — 게임 수가 50·100개로 늘어나도 동일 형식 유지.
