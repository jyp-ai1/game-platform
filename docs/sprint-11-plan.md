# Re:Play Sprint 11 — Platform Growth Foundation

> **PM 확정 (2026-07-24):** "만드는 단계" → **"운영 가능한 서비스"** 전환.
> 우선순위: **운영(Analytics) → SEO → 서비스 품질 → 콘텐츠 확장**
> 컨설팅 플랫폼과 동일한 개발 프로세스 적용.

---

## 프로젝트 목표

게임을 더 만드는 것이 아니라 **운영 가능한 게임 플랫폼**을 만든다.

Sprint 11 이후 확인 가능해야 하는 것:
- 사용자 유입 · 검색 노출
- 운영자가 데이터 확인 (DAU/WAU/MAU, 인기 게임, 이탈)
- 어떤 게임이 인기인지, 어디서 이탈하는지

**범위 제외:** 로그인, Cloud Save, Community, AI 추천, 신규 게임

---

## ROLE / 프로세스

```
PM (GPT)          제품 방향, UX, Sprint, Acceptance, Release 승인
    ↓
Senior Developer (Cursor)   Frontend, Backend, DB, Architecture
    ↓
Senior QA (Cursor)          Unit/Integration/UX/Regression/Lighthouse/Production QA
    ↓
DevOps Reviewer (Cursor)    배포, env, 마이그레이션, Production Smoke
    ↓
PM 승인 (GPT)
    ↓
Production (Cursor)         main push → Vercel → Smoke Test → PM Report
```

**QA PASS 없이 Sprint 종료 불가.**

---

### Sprint 11-2 (PM 승인 — Operation Platform)

**우선순위 변경:** Analytics SDK 수집 → **Dashboard/CMS/SEO** 운영 중심.

1. **T3 Dashboard** (최우선) — Executive KPI · Funnel · Cohort · Heatmap
2. **T5 CMS** — 배너 · 공지 · 이벤트 · 추천 · 게임 ON/OFF
3. **T6 SEO & PWA** — 게임별 metadata · JSON-LD · manifest · apple-touch-icon
4. T4 Game Analytics · T7 운영 기능 · T8 QA

---

## Epic 구조 (PM 확정 v2 — 운영 플랫폼)

| Epic | 이름 | 핵심 |
|---|---|---|
| **Epic 1** | Analytics Platform | analytics_events + 전 이벤트 SDK (진행 중) |
| **Epic 2** | **CMS** | 추천게임 · 배너 · 공지 · 이벤트 · 노출관리 |
| **Epic 3** | SEO & PWA | metadata · OG · JSON-LD · manifest · apple-touch-icon |
| **Epic 4** | Performance | Lighthouse 95+ · CLS · Hydration |
| **Epic 5** | Growth (Home) | Trending · Editor's Pick · Weekly Popular |
| **Epic 6** | Game Operation | Hidden · Coming Soon · Featured · Maintenance |
| **Epic 7** | QA | Lighthouse · Rich Results · 375/768/1440 |

### Admin 확장 경로

```
/admin              Dashboard (Funnel · Cohort · Heatmap)
/admin/analytics    Game Analytics
/admin/games        Game Operation + /admin/game/[slug]
/admin/players      Players (device_id)
/admin/contents     CMS
/admin/seo          SEO & PWA
/admin/settings     Settings
```

---

## T0~T8 (PM 우선순위 v2)

| Task | 내용 | 상태 |
|---|---|---|
| **T0** | Analytics SDK + Admin 게이트 | 🟡 이벤트 대부분 연결 |
| **T1** | Analytics SDK 완료 (game_start/end, ranking, achievement, mission, favorite, profile) | 🟡 game_pause/resume ⬜ |
| **T2** | Admin Layout (좌측 메뉴 7개) | ✅ |
| **T3** | Dashboard — DAU/WAU/MAU · Funnel · Cohort · Heatmap | 🟡 **진행 중 (Sprint 11-2)** |
| **T4** | Game Analytics `/admin/game/[slug]` | ⬜ |
| **T5** | CMS (배너 · 공지 · 이벤트 · 추천 · 순서) | ⬜ |
| **T6** | SEO & PWA 전면 | 🟡 manifest/lang |
| **T7** | Performance | ⬜ |
| **T8** | QA → Production | 🟡 |

### Player Funnel (T3 Dashboard)

```
Session → Game Start → Game Complete → Ranking → Favorite
```

### Cohort Retention (T3)

Day1/D7/D30 + 가입일별 Heatmap (players.first_seen 기준)

---

## Epic 구조 (PM 확정 v1 — archived)

| Epic | 이름 | 핵심 산출물 |
|---|---|---|
| **Epic 1** | 운영 Dashboard | `/admin` — DAU/WAU/MAU, KPI, Retention, Heatmap, TOP10 |
| **Epic 2** | Game Analytics | `/admin/game/[slug]` — 게임별 상세 통계 |
| **Epic 3** | SEO | metadata, OG, sitemap, robots, JSON-LD, Breadcrumb |
| **Epic 4** | 검색 최적화 | FAQ, How to Play, 500~1000자 설명, 카테고리 소개 |
| **Epic 5** | Home UX | Continue→Daily→Season→Popular→카테고리, Trending/Editor's Pick |
| **Epic 6** | Performance | Lighthouse P95+, A11y/BP/SEO 100, CLS/Hydration |
| **Epic 7** | 운영 기능 | 게임 숨기기/Coming Soon/노출순서/추천, 공지/배너/이벤트 |

---

## Epic 1 — 운영 Dashboard (`/admin`)

### 기간 선택
오늘 · 이번주 · 이번달 · 전체

### KPI
- DAU / WAU / MAU
- 오늘 플레이 수, 게임 실행 수, 평균 플레이 시간, 평균 점수
- 랭킹 등록 수, 신규 업적, 미션 완료
- Retention D1 / D7 / D30 (localStorage + Supabase 이벤트 병행)

### 섹션
- 인기 게임 TOP10 (플레이수, 평균점수, 평균시간)
- 카테고리 비율 (Arcade, Puzzle, Brain, Sports, Retro)
- 신규 유저 (최근 7일, device 기준)
- Returning vs New 비율
- 활동 Heatmap (GitHub 스타일, 최근 365일)

---

## Epic 2 — Game Analytics (`/admin/game/[slug]`)

- 게임명, 총 플레이, 평균 플레이시간, 최고점, 평균점수
- 최근 30일 플레이수 차트, 평균점수 변화, Retention
- 랭킹 등록 전환율 (플레이 → 랭킹 등록)
- 업적 달성 분포 (localStorage 이벤트 → Supabase 적재)

---

## Epic 3 — SEO

모든 페이지: title, description, keywords, canonical, robots

- Open Graph + Twitter Card
- sitemap.xml 자동 생성 (`/`, `/games`, `/games/[slug]`, `/categories/[slug]`)
- robots.txt (`/admin` disallow)
- JSON-LD: Game, Organization, WebSite, Breadcrumb
- Breadcrumb UI: Home → Puzzle → 2048

---

## Epic 4 — 검색 최적화

게임 상세: FAQ, How to Play, Tips, Controls (자동/반자동 생성)

- 게임 설명 500~1000자
- 카테고리 소개 페이지 강화

---

## Epic 5 — Home UX

```
Continue → Daily → Season → Popular → Recently Added
→ Puzzle → Retro → Sports → Brain → Arcade
+ Trending, Editor's Pick, New, Weekly Popular
```

---

## Epic 6 — Performance

| 지표 | 목표 |
|---|---|
| Performance | 95+ |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

CLS 최적화, Hydration 스켈레ton, dynamic import 재검토, image preload

---

## Epic 7 — 운영 기능

Admin에서: 게임 숨기기, Coming Soon, 노출순서, 추천게임, 공지, 배너, 이벤트

---

## Analytics 이벤트 (Supabase + localStorage 병행)

> PM 권고: 운영 지표는 **localStorage만으로 만들지 않음**. Supabase `analytics_events`에 서버 적재.

| event_type | 수집 시점 | 상태 |
|---|---|---|
| `session_start` | 게임 페이지 진입 | ✅ 구현 |
| `game_start` | 게임 play phase 시작 | ⬜ T0 |
| `game_end` | 게임 종료 | ⬜ T0 |
| `score_submit` | 랭킹 제출 | ⬜ T0 |
| `achievement_unlock` | 업적 달성 | ⬜ T0 |
| `mission_complete` | 일일/주간 미션 완료 | ⬜ T0 |
| `daily_reward_claim` | 출석 보상 | ⬜ T0 |
| `save_created` | Save SDK 저장 | ⬜ T0 |
| `resume` | 이어하기 | ⬜ T0 |
| `error` | 전역 JS 에러 | ⬜ T0 |
| `share` | 결과 공유 | ⬜ T4 |

### DB 테이블 (마이그레이션)

| 테이블 | SQL | 상태 |
|---|---|---|
| `analytics_events` | `0010_sprint11.sql` | ✅ |
| `players`, `sessions`, `game_sessions`, `leaderboards`, `matches` | `0011_platform_tables.sql` | ✅ 스크립트 (Supabase 실행 필요) |

---

## 구현 순서 (T0~T8)

| Task | 내용 | 상태 |
|---|---|---|
| **T0** | Analytics SDK 확장, `/admin` 게이트, build/lint/typecheck | 🟡 부분 완료 |
| **T1** | Dashboard (기간 선택, DAU/WAU/MAU, Heatmap, Retention) | 🟡 기초만 |
| **T2** | Game Analytics `/admin/game/[slug]` | ⬜ |
| **T3** | SEO 전면 (canonical, JSON-LD, Breadcrumb) | 🟡 manifest/lang/robots |
| **T4** | Home UX 개선 | ⬜ |
| **T5** | Performance (CLS, Lighthouse 95+) | ⬜ |
| **T6** | Admin 운영 기능 (공지/배너/노출) | ⬜ |
| **T7** | QA (375/768/1440, Lighthouse, Rich Results) | ⬜ |
| **T8** | 배포 → Smoke → PM Report | 🟡 push 자동화 |

---

## Sprint 11 완료 기준 (Definition of Done)

### 개발
- [ ] 운영 Dashboard 구현 완료
- [ ] 게임별 Analytics 페이지 구현 완료
- [ ] SEO(메타, OG, Sitemap, Robots, JSON-LD) 전면 적용
- [ ] 홈 화면 정보 구조 개선
- [ ] 운영 기능(배너, 공지, 추천, 노출 관리) 구현 완료

### 품질
- [ ] Lighthouse: P95+, A11y 100, BP 100, SEO 100
- [ ] Google Rich Results Test Structured Data 오류 0
- [ ] 모바일 375 / 태블릿 768 / 데스크톱 1440 레이아웃
- [ ] typecheck / lint / build 0 에러
- [ ] Production Smoke Test

---

## QA 체크리스트 (Cursor Senior QA)

```
□ Lighthouse          □ Structured Data    □ robots
□ sitemap             □ metadata           □ canonical
□ OG                  □ twitter            □ mobile 375
□ tablet 768          □ desktop 1440       □ Admin Dashboard
□ Admin 통계          □ Heatmap            □ Returning User
□ Popular Game        □ SEO Score          □ Performance
□ Production
```

---

## 진행 현황 스냅샷 (2026-07-24)

### 완료
- [x] Sprint 10 프로덕션 배포 + 마이그레이션 0001~0009
- [x] `0010` analytics_events + track RPC + Admin 집계 RPC
- [x] `0011` players/sessions/game_sessions/leaderboards/matches
- [x] `/admin` 로그인 (ADMIN_SECRET) + Today 카드 + TOP10 + Live + Growth 테이블
- [x] `session_start` 이벤트 수집
- [x] SEO 기초: manifest, lang=ko, robots /admin disallow, keywords
- [x] Admin 비밀번호 눈 표시 토글

### 다음 작업 (T0→T1)
1. `0012` 이벤트 타입 확장 SQL Supabase 실행
2. Analytics SDK — game-sdk 훅 포인트에 score_submit, achievement_unlock 등 연결
3. Dashboard 기간 선택 (오늘/주/월/전체) + WAU/MAU
4. Retention D1/D7/D30 SQL + Heatmap 컴포넌트

---

## 환경 변수

```
ADMIN_SECRET=
SUPABASE_SECRET_KEY=       # Secret keys 또는 service_role
NEXT_PUBLIC_SITE_URL=https://game29.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_SITE_VERIFICATION=  # 선택
```

---

## PM Report 형식 (Sprint 종료 시)

1. 구현된 기능 목록
2. 생성/수정된 파일 목록
3. Supabase 변경사항 (SQL)
4. Git 커밋 내역
5. Vercel 배포 결과
6. 남은 TODO
7. 다음 Sprint 개선 제안
