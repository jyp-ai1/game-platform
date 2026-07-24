# Sprint 13 — Game Launch & Retention

**Status:** **Planning ✅ PASS** — **Implementation ⏸️ HOLD**  
**Kick-off:** Sprint 12 GA (`v1.12.0`) + PM sign-off only  
**Design prep:** [`docs/sprint-13-design-prep.md`](./sprint-13-design-prep.md) · Specs: [`docs/sprint-13/specs/`](./sprint-13/specs/)

---

## PM 검토 결과

| 항목 | 평가 |
| --- | --- |
| 방향성 | ✅ PASS |
| 우선순위 | ✅ PASS |
| Sprint 13 구성 | ✅ PASS (Epic 1~5 개정 반영) |
| KPI | ✅ PASS |
| Game Selection | ✅ PASS |
| Release 전략 | ⚠️ → ✅ 보완 ([Release Gate](#release-gate-t0) 참고) |

**핵심 결정:** Game29 = **게임 플랫폼** (AI 서비스 아님). Sprint 12 **AI FROZEN** 유지.

---

## Phase 1 (베타) — 리텐션 사이클

```
게임 출시 (Game Package)
    ↓
미션 수행
    ↓
랭킹 경쟁
    ↓
매일 방문
    ↓
(향후) 친구 비교 · 시즌 · 커뮤니티
```

로드맵: `게임 추가 → 재미 → 리텐션 → 커뮤니티 → 운영 데이터 → AI(나중)`

---

## Sprint 13 Epics (PM 확정)

### Epic 1 — Core Gameplay Expansion

**「게임 N개 추가」가 아니라 「게임 N개 출시」**

하나의 **Game Package** = 아래 전부 포함:

| 포함 항목 | 설명 |
| --- | --- |
| 게임 코드 | `games/*` 패키지 |
| 썸네일 · 스크린샷 | `generate-thumbnails.mjs` |
| SEO | metadata · JSON-LD · sitemap |
| 미션 | Daily / Weekly hook |
| XP · Season | `game-sdk` engagement |
| 랭킹 | score → ranking_submit |
| 저장 | save / resume |
| 카테고리 | DB row + category |

**Sprint 13 출시 대상 (4종, PM 확정):**

1. **Pinball** ★★★★★  
2. **Connect4** ★★★★★  
3. **Water Sort** ★★★★★  
4. **Mahjong** ★★★★★  

선정 이유: 5분 이내 · 규칙 쉬움 · 모바일 · 랭킹 · 반복성

---

### Epic 2 — Retention

신규 게임을 **자연스럽게** 플레이하도록 미션 강화.

예시 (Weekly):

```
이번주 신규게임 플레이
+
신규게임 3판
+
신규게임 점수 500점
```

- `weekly-missions.ts` / `missions.ts` — 신규 slug 타겟 미션
- Daily Challenge — 당일 신규 게임 목표 연동

---

### Epic 3 — Launch Event (CMS)

CMS로 출시·추천 운영:

```
NEW — Pinball 출시 — XP 2배
이번주 추천 — Connect4
```

- `cms_events` · `cms_featured_games` · `cms_banners`
- Notification Center (`/admin/notifications`)에서 채널 확인

---

### Epic 4 — Game Analytics

게임 출시 시 **무조건** 함께 측정:

| 지표 | 정의 |
| --- | --- |
| **CTR** | 목록/홈 카드 클릭 → 상세 진입 |
| **Play** | session_start / game_start |
| **Finish** | game_end / game_over |
| **Retry** | 동일 slug 재 session (당일) |
| **Average Time** | game_end metadata duration |
| **Ranking Rate** | ranking_submit / game_start |

→ 게임이 **재미있는지 데이터로 검증**

---

### Epic 5 — Admin KPI (5초 판단)

`/admin` **첫 화면** — 운영자가 5초 안에 상태 파악:

| 카드 | 설명 |
| --- | --- |
| **DAU** | 오늘 방문 |
| **D1** | 어제 cohort D1 retention |
| **현재 인기게임** | 실시간/오늘 TOP1 |
| **오늘 신규게임** | Sprint 출시 slug 플레이 수 |
| **오늘 오류** | errors today |
| **오늘 이벤트** | 활성 CMS event 수 |

상세 KPI drill-down: [`docs/pm-kpi-framework.md`](./pm-kpi-framework.md)

---

## Sprint 13 필수 기능 (PM Must-Have)

신규 게임이 묻히지 않게:

| 기능 | Spec |
| --- | --- |
| **`NEW` 배지** | 출시 후 **7일** 노출 (게임 카드 · 상세) |
| **이번주 신규게임 카드** | 홈 전용 섹션 |
| **첫 플레이 XP 2배** | 해당 slug **첫 session_start** · **7일** (출시 주) |

---

## 작업 지시서 (T0–T6)

| Task | Scope |
| --- | --- |
| **T0** | **Release Gate** — Sprint 12 GA (`v1.12.0`, rollback drill, QA PASS), Sprint 13 브랜치·기준선 |
| **T1** | **Game Package #1** — Pinball (게임 + 저장 + 랭킹 + 미션 + SEO) |
| **T2** | **Game Package #2** — Connect4 |
| **T3** | **Game Package #3** — Water Sort (+ #4 Mahjong 또는 T3/T4 분할) |
| **T4** | **Launch Operations** — NEW 배지 · 홈 신규 섹션 · CMS 출시 이벤트 · 첫 플레이 XP 2배 |
| **T5** | **Analytics & KPI** — 게임별 6지표 수집 · `/admin` 상단 6카드 |
| **T6** | **QA & Release** — Dev → QA → DevOps → PM Gate · `v1.13.0` · Release Notes |

**명시적 제외:** AI 확장 · Cloud Save · OAuth · Friend Compare (→ Sprint 14)

---

## Game Package 체크list (출시 1종당)

- [ ] 선정 기준 7항목 PASS ([`game-selection-criteria.md`](./game-selection-criteria.md))
- [ ] `games/<slug>` · `playable-games.ts` · `game-player.tsx`
- [ ] save/resume · ranking · XP/season hooks
- [ ] Daily/Weekly 미션 연동 (신규 slug)
- [ ] 썸네일 · 스크린샷 · Supabase `games` row
- [ ] SEO metadata · sitemap
- [ ] CMS event / featured (해당 주)
- [ ] NEW 배지 (7일) · 첫 플레이 XP 2배
- [ ] Game Analytics 6지표 이벤트
- [ ] 모바일 375px QA

---

## DoD (Sprint 13 완료 기준)

게임 4개 추가 ≠ 완료. **출시 패키지** 기준:

- [ ] 신규 게임 **2~4종 출시** (Pinball · Connect4 · Water Sort · Mahjong)
- [ ] 저장/이어하기 · 리더보드 · Daily/Weekly Mission · XP/Season
- [ ] CMS 신규 게임 이벤트 등록
- [ ] `NEW` 배지 · 홈 「이번주 신규게임」 · 첫 플레이 XP 2×
- [ ] 게임별 KPI 6종 자동 수집
- [ ] `/admin` 상단 6카드 KPI
- [ ] 모바일 (375px) QA
- [ ] Lighthouse · 회귀 테스트 PASS
- [ ] Governance v2.0 **4 Gate** PASS (Developer · QA · DevOps · PM)

---

## Release Gate (T0)

Sprint 13 착수 **전** 필수:

| Step | Action |
| --- | --- |
| 1 | Sprint **11** GA — `v1.11.0` (미완 시 병행 마무리) |
| 2 | Sprint **12** GA — rollback drill ≤15s · QA 130-case · `v1.12.0` tag · GitHub Release |
| 3 | Production smoke — sitemap 200 · monitoring · flags |
| 4 | `git checkout -b sprint-13/game-launch` (또는 PM 지정 브랜치) |
| 5 | PM Sprint 13 kickoff sign-off |

**베타 릴리스 규칙:**

- Sprint N GA 없이 Sprint N+1 기능 개발 **금지** (PM 예외 시 문서화)
- 매 Sprint tag: `v1.13.0`, `v1.14.0`, …
- Rollback point: 직전 GA tag

---

## 후속 Sprint 게임 로드맵 (PM)

| Sprint | 게임 |
| --- | --- |
| **13** | Pinball · Connect4 · Water Sort · Mahjong |
| **14** | Solitaire · FreeCell · Chess |
| **15** | Bomberman · Pac-Man · Duck Hunt |
| **16** | Typing · Word Search · Hangman (variant) |

---

## Architecture

```
Home (NEW badge · 이번주 신규)
    ↓
Game Package (play · save · rank · mission · XP)
    ↓
Analytics (CTR · Play · Finish · Retry · Time · Ranking%)
    ↓
Admin KPI (5초 카드)
    ↓
CMS Launch Event
```

---

## PM Note

Sprint 13 = **「기능을 만드는 프로젝트」→「사람들이 계속 플레이하는 게임 플랫폼」** 전환점.

Sprint 11~12 Operation Platform ✅ · Sprint 13부터 **출시 품질**이 KPI다.
