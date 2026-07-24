# PM KPI Framework — Re:Play Daily Ops

**확정일:** 2026-07-24 (PM Review — Operation Readiness 반영)  
**적용:** Sprint 12 GA 이후 · 베타 Phase 1

---

## 원칙

1. **배포 가능 ≠ 운영 준비** — Operator Readiness Gate 추가  
2. **Admin 5초** — 6카드로 오늘 상태 판단  
3. **게임 출시** — Analytics + Review Card + 운영 가이드

**우선순위:** 게임 품질 → 리텐션 → 운영 데이터 → 신규 게임 → AI

---

## Admin 첫 화면 6카드 (Sprint 13 Epic 3)

운영자 **5초** — 끝.

| 카드 | 데이터 소스 |
| --- | --- |
| **DAU** | today unique device_id |
| **Finish** | game_end / game_start (Finish Rate) |
| **Mission** | mission_complete / DAU |
| **Ranking** | ranking_submit / game_start |
| **Top Game** | active_games[0] |
| **Avg Play Time** | avg_play_time_sec |

---

## Platform KPI (기존)

| KPI | Admin |
| --- | --- |
| DAU | Dashboard |
| Retention | Dashboard · Cohort |
| Mission | Mission Rate 카드 |
| Ranking | Ranking Submit 카드 |

---

## Game KPI (Sprint 13 추가)

게임별 D+7 Review Card:

| KPI | 정의 |
| --- | --- |
| **7일 생존율** | slug 플레이어 D7 재방문 |
| **첫 플레이율** | first play / impressions |
| **재플레이율** | Retry % |
| **즐겨찾기율** | Favorite % |

→ [`game-review-card.md`](./game-review-card.md)

---

## Game Analytics Events

Play · Finish · Retry · Quit · Resume · Favorite · (Share 추후)

→ [`sprint-13/specs/game-analytics-kpi.md`](./sprint-13/specs/game-analytics-kpi.md)

---

## Operation Readiness

운영자 **5분** 내:

- CMS solo (6 tasks)
- Analytics 5 sec (6 KPIs)
- Incident 1 min
- Feature Flag without dev

→ [`operator-manual.md`](./operator-manual.md)

---

## PM Note

Sprint 13~16 = **"유저가 얼마나 다시 돌아오는가"**  
출시 = **19-item Package + 운영 문서** 하나의 결과물.
