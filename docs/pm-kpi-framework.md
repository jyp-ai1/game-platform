# PM KPI Framework — Re:Play Daily Ops

**확정일:** 2026-07-24 (PM Review 반영)  
**적용:** Sprint 12 GA 이후 · 베타 Phase 1

---

## 원칙

1. **첫 화면 5초** — `/admin` 상단에서 오늘 상태 즉시 판단 (Epic 5)  
2. **Drill-down** — 상세는 Monitoring · Analytics · Reports  
3. **게임 출시 시** — Game Analytics 6지표 필수 (Epic 4)

---

## Admin 첫 화면 6카드 (Sprint 13 T5)

운영자 **매일 아침** 이것만 보면 됩니다.

| 카드 | 데이터 소스 | 목표 |
| --- | --- | --- |
| **DAU** | `get_dashboard_kpis` / today | 오늘 몇 명 왔는가 |
| **D1** | `get_cohort_retention` (어제 cohort) | 어제 신규의 재방문 |
| **현재 인기게임** | `get_ops_realtime_stats` active_games[0] | 지금/오늘 TOP1 |
| **오늘 신규게임** | analytics by slug (Sprint 13 launch slugs) | 출시 게임 uptake |
| **오늘 오류** | `errors_today` | 장애 여부 |
| **오늘 이벤트** | CMS active events count | Launch ops 상태 |

---

## 핵심 KPI (Daily · Drill-down)

| # | KPI | 정의 | Admin 위치 |
| --- | --- | --- | --- |
| 1 | **DAU** | 오늘 unique device_id | `/admin` · Monitoring |
| 2 | **재방문율** | D1 / D7 / D30 | Cohort Grid |
| 3 | **게임별 인기** | session_start by slug | Analytics TOP15 |
| 4 | **평균 플레이 시간** | avg_play_time_sec | Dashboard extended KPI |
| 5 | **미션 완료율** | mission_complete / DAU | Analytics (T5) |
| 6 | **랭킹 참여율** | ranking_submit / game_start | Funnel |

---

## Game Analytics 6지표 (출시 게임 필수)

| 지표 | 이벤트 / 계산 |
| --- | --- |
| **CTR** | card_click → game detail (metadata) |
| **Play** | session_start / game_start |
| **Finish** | game_end / game_over |
| **Retry** | same slug 2+ session_start / day |
| **Average Time** | game_end metadata `duration_sec` |
| **Ranking Rate** | ranking_submit / game_start |

---

## Funnel (랭킹 참여율)

```
Play → Score/Finish → Ranking Submit
```

---

## Phase 1 사이클

```
게임 출시 → 미션 → 랭킹 → (Sprint14+) 친구 비교 → 매일 방문
```

**AI · 신규 Admin Epic · Cloud Save = Phase 1 제외**

---

## PM Note

6카드 = **판단** · 6 KPI = **분석** · Game Analytics 6 = **게임 품질 검증**
