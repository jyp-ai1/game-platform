# Re:Play Sprint 11 — Operations & SEO

> **PM 확정 방향 (2026-07-24):** Sprint 6~10으로 리텐션 루프(성장/미션/시즌/저장/랭킹)가 완성되었으므로,
> Sprint 11부터는 **신규 게임 추가를 중단**하고 **운영 가능한 플랫폼(MVP)** 으로 전환한다.
> HANDOFF.md의 이전 Sprint 11 초안(Cloud Save/OAuth)은 **Sprint 12로 연기**.

## Context

### Sprint 6~10 회고 (PM 승인)

```
Sprint 6  Engagement (XP/레벨/업적)
Sprint 7  Daily Mission
Sprint 8  Player Hub
Sprint 9  Save / Resume
Sprint 10 Season / Weekly / Ranking / Daily Reward
```

플레이어가 돌아올 이유(시즌·경쟁·보상·랭킹·저장)의 **기본 리텐션 구조는 완성**됨.
현재 플레이 가능 게임 **21개** — PM 판단상 게임 수는 충분, 이후 추가는 Sprint 16(Retro Collection)까지 보류.

### Sprint 10 완료 상태

- [x] 코드 커밋 `124eac6`, `origin/main` push
- [x] Supabase `0001`~`0009` 마이그레이션 적용
- [x] 프로덕션 `https://game29.vercel.app/` 스모크 테스트 통과

### PM 로드맵 (확정)

```
Sprint 11  Operations & SEO          ← 이번 스프린트
Sprint 12  Cloud Save + Login
Sprint 13  Community
Sprint 14  AI Recommendation + Home UX (Tab 구조)
Sprint 15  (예비) Tournament / Replay
Sprint 16  Retro Game Collection (10~15종, 게임성 참고 오리지널 구현)
```

**범위 제외 (Sprint 11):** 로그인, Cloud Save, Community, AI 추천, 광고, 신규 게임

---

## 현재 코드베이스 vs Sprint 11 갭

| 영역 | 이미 있음 | Sprint 11에서 추가 |
|---|---|---|
| SEO | metadata, OG, Twitter, robots, sitemap, 게임 JSON-LD, favicon | manifest, canonical, `lang="ko"`, 카테고리 OG, Search Console verification, 정적 페이지 metadata 강화 |
| Analytics | `play_count` RPC, 클라이언트 engagement(localStorage) | `analytics_events` 테이블, 이벤트 수집, Admin 집계 |
| Admin | 없음 | `/admin` 대시보드 (ADMIN_SECRET + service role) |
| Share | OG 미리보기만 | Share 버튼, URL/결과 복사, Web Share API |
| Performance | 게임 dynamic import, next/image | CLS 해결(스켈레ton/Tab), Lighthouse 95+ 목표 |
| Error tracking | `console.error` only | 클라이언트 error 이벤트 → Admin Error 패널 |

---

## Epic 1 — Admin Dashboard (`/admin`)

운영자가 서비스 현황을 한눈에 파악.

**Today 카드:**
- DAU (analytics_events 기준 고유 device_id)
- 총 플레이 수 (session_start 이벤트 또는 play_count)
- Save 생성 / Resume 사용 (이벤트 기반, Sprint 11 후반)

**Growth:**
- 최근 30일 DAU/플레이 추이 (일별 집계)

**인기 게임:**
- play_count + analytics 기반 TOP 10 바 차트

**인증:** `ADMIN_SECRET` 환경변수 + httpOnly 쿠키. Supabase Auth/OAuth는 Sprint 12.

---

## Epic 2 — Game Analytics

게임별 상세 페이지 `/admin/games/[slug]`:

- 총 플레이, 평균 플레이 시간(세션 이벤트 쌍), Save 생성률, Game Over 비율
- 시간대별/요일별 히트맵 (후반)

---

## Epic 3 — Live Dashboard

실시간(폴링 30s):
- 최근 5분 내 session_start 수 = "현재 접속" 근사치
- 최근 플레이 로그 (device_id 마스킹, game_slug, N초 전)

---

## Epic 4 — Error Dashboard

클라이언트 `window.onerror` / `unhandledrejection` → `track_event('error', ...)` → Admin 패널.

---

## Epic 5 — SEO

- 전 페이지 canonical (`alternates.canonical`)
- `manifest.ts` (PWA icon, theme_color)
- 카테고리/검색 페이지 OG metadata
- 게임 SEO 키워드 강화 ("2048 Online", "Browser Puzzle", "No Download")
- JSON-LD: WebSite, BreadcrumbList (게임/카테고리)
- `robots.ts`: `/admin` disallow
- `sitemap.ts`: `/admin`, `/profile`, `/favorites` 제외 유지
- Google Search Console verification meta (`GOOGLE_SITE_VERIFICATION` env)

---

## Epic 6 — Share

게임 종료/점수 제출 후:
- Share 버튼 (Web Share API 또는 fallback)
- Copy URL / Copy Result (점수+순위 텍스트)

---

## Epic 7 — Performance (CLS + Lighthouse 95+)

- 홈 engagement 카드 4종: SSR 스켈레ton (고정 높이) → hydration 후 교체
- 또는 Tab UI로 카테고리 캐러셀 축소 (PM 원안, Epic 7과 병행 가능)
- carousel `next/image` sizes 최적화
- `GameGridSkeleton` 실제 사용

---

## Epic 8 — Search Console Ready

- `robots.txt` + `sitemap.xml` 검증
- prod `NEXT_PUBLIC_SITE_URL=https://game29.vercel.app` Vercel env 설정
- manifest + favicon + apple-touch-icon
- verification meta 태그

---

## Analytics 이벤트 스키마 (Epic 1~4 공통)

### 테이블 `analytics_events`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | PK |
| event_type | text | `session_start`, `game_over`, `score_submit`, `save_created`, `resume`, `error`, `share` |
| game_slug | text | nullable, FK games(slug) |
| device_id | text | localStorage UUID (익명) |
| metadata | jsonb | `{ score, error_message, duration_ms, ... }` |
| created_at | timestamptz | |

### 수집 지점 (기존 2개 훅 포인트 패턴 확장)

- `recently-played-recorder.tsx` → `session_start`
- `context.tsx` reportScore/handleSubmit → `score_submit`
- `save.ts` saveGame → `save_created`
- `use-resumable-game.ts` onResume → `resume`
- 전역 error handler → `error`

---

## PM KPI (수집 목표)

### 퍼널
홈 방문 → 게임 시작 → 1분+ 플레이 → 점수 등록 → 재방문 → Save → Resume

### 게임 KPI
시작 수, 완료 수, 평균 플레이 시간, Save 생성률, Resume 성공률, 재도전 비율

### 사용자 KPI
DAU/WAU/MAU, D1/D7/D30, 평균 세션 길이

### 콘텐츠 KPI
인기 TOP 10, 급상승, 시즌 XP, 미션/업적 완료율

---

## 구현 순서 (의존성)

| Phase | Epic | 산출물 |
|---|---|---|
| **1** | Analytics data layer | `0010_sprint11.sql`, track RPC, client `trackEvent()` |
| **2** | Admin shell | `/admin` auth, Today 카드, 인기 게임 |
| **3** | SEO hardening | manifest, canonical, lang, robots, verification |
| **4** | Share UI | 게임 결과 공유 버튼 |
| **5** | Performance/CLS | 스켈레ton, Lighthouse 회귀 테스트 |
| **6** | Game Analytics + Live + Error | `/admin/games/[slug]`, live poll, error panel |

---

## QA 체크리스트 (Sprint 종료 조건)

- [ ] `/admin` ADMIN_SECRET 없이 접근 차단
- [ ] `session_start` 이벤트가 Supabase에 기록됨
- [ ] Admin Today 카드에 DAU/플레이 수 표시
- [ ] manifest.json 200 응답
- [ ] `/admin` robots disallow
- [ ] Share 버튼 동작 (copy URL 최소)
- [ ] Lighthouse Performance ≥ 95 (또는 CLS < 0.1, PM과 협의)
- [ ] `npm run typecheck` / `npm run lint` / `npm run build` 0 오류
- [ ] 모바일 375px 레이아웃 확인

---

## 환경 변수 (Sprint 11 추가)

```
ADMIN_SECRET=              # /admin 접근 비밀번호 (서버 전용)
SUPABASE_SECRET_KEY=       # Admin 집계 쿼리용 service role (기존 예약, Sprint 11부터 사용)
NEXT_PUBLIC_SITE_URL=      # prod: https://game29.vercel.app
GOOGLE_SITE_VERIFICATION=  # Search Console (선택)
```

---

## 역할 분담

| 역할 | 담당 |
|---|---|
| PM (ChatGPT) | 제품 방향, UX, Sprint, Acceptance, Release 승인 |
| Cursor Senior Full Stack | Frontend, Backend, DB, Architecture |
| Cursor Senior QA | Unit/Integration/UX/Regression/Lighthouse/Production QA |

**개발 완료 후 QA PASS 없이 Sprint 종료 불가.**
