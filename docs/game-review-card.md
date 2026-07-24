# Game Review Card — Standard

**적용:** Sprint 13+ — **신규 게임마다 1장**  
**Admin 표시:** Sprint 13 T6 — `/admin` 또는 `/admin/analytics` 게임 상세 탭  
**저장:** `docs/reports/game-reviews/{slug}-{YYYY-MM}.md`

Spec (Sprint 13): [`sprint-13/specs/game-review-card.md`](./sprint-13/specs/game-review-card.md)

---

## 목적

게임 출시 후 **D+7**에 PM·운영자가 데이터 기반으로 품질을 평가합니다.  
Review Card가 누적되면 **어떤 게임이 리텐션에 기여하는지** 판단할 수 있습니다.

---

## Card Template

### Summary (Admin / 문서 공통)

```
┌─────────────────────────────────────┐
│  Pinball                    [NEW]   │
│  난이도  ★★★★☆                      │
│  평균 플레이  3분                     │
│  PM 추천  ★★★★★                     │
│  Retry  89%  ·  Favorite  12%       │
│  7일 생존율  34%  ·  첫 플레이율  62% │
│  PM 평가  PASS                      │
└─────────────────────────────────────┘
```

---

## Fields

| 항목 | 설명 | 데이터 소스 |
| --- | --- | --- |
| **게임명** | Display name | `games.title` |
| **Slug** | URL slug | `games.slug` |
| **출시일** | GA date | `games.released_at` |
| **난이도** | ★1~5 (PM 설정) | Manual · D+7 조정 |
| **평균 플레이 시간** | Avg Time | Analytics |
| **PM 추천** | ★1~5 (운영 추천도) | PM |
| **Retry** | 재플레이율 % | Analytics `retry` |
| **Favorite** | 즐겨찾기율 % | Analytics `favorite_add` |
| **7일 생존율** | D7 cohort for slug players | Cohort RPC |
| **첫 플레이율** | First play / impressions | Analytics |
| **Finish Rate** | Finish / Play | Analytics |
| **버그** | P0 / P1 / P2 | Error Center |
| **PM 평가** | **PASS / HOLD** | PM sign-off |

---

## Example — Pinball (placeholder)

| 항목 | Pinball |
| --- | --- |
| 난이도 | ★★★★☆ |
| 평균 플레이 | 3분 |
| PM 추천 | ★★★★★ |
| Retry | — (pre-launch) |
| Favorite | — |
| 7일 생존율 | — |
| 첫 플레이율 | — |
| PM 평가 | — |

---

## PM Evaluation (D+7)

| Result | Condition (draft) |
| --- | --- |
| **PASS** | Finish ≥40% · Retry ≥20% · 0 P0 · Avg time 2–5min |
| **HOLD** | Below threshold or open P0/P1 |

Baseline 조정: Sprint 13 4종 출시 후.

---

## Workflow

```
Game Package GA
    ↓
D+7 Analytics 수집
    ↓
Review Card 작성 (docs/reports/game-reviews/)
    ↓
Admin 표시 갱신
    ↓
PM PASS / HOLD → Portfolio Report 입력
```

---

## Package Requirement

Game Package **19개** 중 **Review Card** — 출시 시 placeholder 생성, D+7 갱신.

---

## Cumulative Value

분기별 **Game Portfolio Report** — D1/D7 기여 게임 순위.
