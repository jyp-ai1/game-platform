# Color Sort — Operation Guide

**Slug:** `color-sort`  
**Category:** puzzle  
**Released:** 2026-07-24  
**PM Owner:** ___________

---

## 1. 추천 대상

| 항목 | 내용 |
| --- | --- |
| 연령/취향 | 캐주얼 · puzzle 게임 선호 유저 |
| 플레이 시간 | 2~5분 |
| 난이도 | EASY |
| 모바일 적합 | Yes |
| PM 추천 | ★★★★☆ |

---

## 2. 운영 방법

- **NEW 배지:** `released_at` 기준 7일 (migration 0022)
- **Featured:** `/admin/cms/featured` → `new_games` 슬롯
- **Launch Event:** `/admin/cms/events` (0022 시드 또는 수동)
- **Visibility:** `/admin/cms/visibility` → visible

### 미션

- Daily: 카테고리(puzzle) 플레이 미션 자동 연동
- Weekly: 주간 N판 미션 자동 연동

---

## 3. 점검 (운영자)

| Check | How | Expected |
| --- | --- | --- |
| Load | `GET /games/color-sort` | 200 |
| Play | 1판 완료 | 점수/결과 표시 |
| Save | 중간 저장 → 새로고침 | Resume (해당 게임) |
| Ranking | 게임 종료 후 | 랭킹 제출 |
| Analytics | `/admin/analytics` Sprint 13 KPI | Play +1 |
| Mobile | 375px | 터치 playable |

---

## 4. 비활성화

1. `/admin/cms/visibility` → Maintenance/Hidden
2. 또는 `/admin/flags` → `beta_games` OFF

---

## 5. 관련 문서

- Review Card: [`../reports/game-reviews/color-sort-2026-07.md`](../reports/game-reviews/color-sort-2026-07.md)
- Package: [`../templates/game-package-template.md`](../templates/game-package-template.md)
