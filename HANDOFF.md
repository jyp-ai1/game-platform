# Re:Play 프로젝트 인수인계 문서 (전체 상세본)

작성일: 2026-07-22 (Sprint 10 완료 직후)
작성 목적: 지금까지 Claude Code로 진행하던 개발을 Cursor(또는 다른 툴)로 옮기기 위한 **전체 컨텍스트 이전**.
Claude Code의 세션 메모리(`~/.claude/projects/.../memory/`)와 지금까지의 전체 대화 맥락에 있던 내용을
빠짐없이 이 파일 하나에 옮겨 담았습니다. Cursor는 이 경로에 접근할 수 없으므로, **이 문서가 유일한
인수인계 소스**입니다.

---

## 목차
1. 프로젝트 개요
2. 로컬 개발 환경 설정
3. 저장소 구조 상세
4. 핵심 아키텍처 패턴
5. 되돌리면 안 되는 아키텍처 결정
   - 5.5 Supabase 마이그레이션 요약
6. 스프린트 1~10 전체 상세 히스토리
7. packages/game-sdk 전체 모듈 맵
8. 게임 목록 및 게임 추가 표준 프로세스
9. 알려진 환경 이슈 / 함정 (전체)
10. PM(사용자)의 작업 방식
11. 남은 작업 / 다음 단계
12. Cursor로 옮길 때 참고사항

---

## 1. 프로젝트 개요

- **제품명**: Re:Play (구 Play29, Sprint 5에서 리브랜딩)
- **컨셉**: 1990~2010년대 추억의 게임을 브라우저에서 바로 즐기는 캐주얼 게임 플랫폼.
  "3초 안에 게임 시작" — 로그인/가입 없이 즉시 플레이가 핵심 가치.
- **타겟 게임 수**: 장기 목표 ~100개, 오픈소스 포팅:오리지널 = 30:20 비율로 50개 달성이 1차 목표 (PM이 2026-07-17 확정).
  단, Sprint 10에서 "게임 수를 빠르게 늘리기보다 플레이어가 돌아오는 이유(시즌/경쟁/보상/랭킹)를 만드는 것"으로
  우선순위가 전환됨 — 이후 스프린트는 게임 추가보다 참여 유도 시스템에 무게가 실릴 가능성이 높음.
- **구조**: npm workspaces 기반 모노레포
  - `apps/web` — Next.js 16 (App Router, Turbopack) 메인 사이트
  - `packages/game-sdk` — 모든 게임이 공유하는 SDK (점수/랭킹/XP/미션/저장/시즌 등, 아래 7절에서 전체 모듈 상세)
  - `packages/ui` — 공유 UI 컴포넌트 (Button, Progress, ScoreBox, GameOverOverlay, Container, SectionTitle 등)
  - `packages/shared` — 공유 TypeScript 타입 (Game, Category, Difficulty, GameStatus 등)
  - `games/*` — 게임별 독립 패키지 (현재 21개, 9절 참고)
  - `supabase/migrations/*.sql` — DB 스키마 변경 이력 (0001~0009, 아래 상세)
  - `scripts/generate-thumbnails.mjs` — sharp로 게임 썸네일/갤러리 이미지를 절차적으로 생성하는 스크립트 (실제 이미지 생성 모델이 없는 환경이라 SVG 아이콘을 코드로 그려서 PNG로 렌더링하는 방식)
- **DB/백엔드**: Supabase (Postgres + RPC 함수). 로그인 없음 — `device_id`(localStorage UUID) + 닉네임 방식.
- **배포**: Vercel (GitHub `jyp-ai1/game-platform` 리포 → main 브랜치 push 시 자동 배포). Vercel 프로젝트명 `game29`, 팀 `jyp-ai1s-projects` (Hobby 플랜). **로컬 CLI 링크(`.vercel` 폴더) 없음** — GitHub 앱 연동만 사용 (2절 상세).
  - **프로덕션 URL은 코드에 하드코딩되어 있지 않음** — `apps/web/lib/site.ts`의 `siteUrl`이 `NEXT_PUBLIC_SITE_URL` 환경변수 → 없으면 Vercel의 `VERCEL_PROJECT_PRODUCTION_URL` → 없으면 `VERCEL_URL` → 없으면 `http://localhost:3000` 순으로 동적 결정됨. 실제 배포 도메인은 Vercel 대시보드(프로젝트 `game29`)에서 확인할 것.
- **Supabase 프로젝트**: 이번 세션의 네트워크 요청에서 확인된 URL은 `https://fecwbzyuktkzrbqqxtid.supabase.co` (anon 키와 마찬가지로 클라이언트에 노출되는 값이라 시크릿 아님, 정확한 값은 `apps/web/.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`로 재확인). 대시보드: `https://supabase.com/dashboard/project/fecwbzyuktkzrbqqxtid`. **로컬 CLI 링크(`supabase/config.toml`) 없음** — 마이그레이션은 대시보드 SQL Editor에 수동 실행 (2절 상세).
- **Git 원격**: `git@github.com:jyp-ai1/game-platform.git`
- **사용자 계정**: kiraranim@gmail.com. GitHub 계정/조직이 프로젝트 중간에 `kiraranim-jyp` → `detourdada1` → 다시 `jyp-ai1` 등으로 바뀐 이력이 있음 — 항상 현재 상태를 `git remote -v`로 확인할 것, 과거 기록을 그대로 믿지 말 것.

## 2. 로컬 개발 환경 설정

**Node.js 버전**: 루트/apps/web의 `package.json`에 `engines` 필드가 없어 버전이 코드로 고정되어 있지는 않음. 이 세션에서 실제 개발에 사용한 버전은 **Node v24.18.0**(`.nvmrc` 없음). Next.js 16 최신 기능을 쓰므로 Node 20 LTS 이상을 권장하되, 문제가 생기면 v24로 맞추는 것이 가장 안전함.

```bash
# 최초 1회
npm install                      # 루트에서 실행 — 모든 workspace(games/*, packages/*, apps/web) 연결

# 개발 서버
npm run dev                      # apps/web의 next dev 실행 (Turbopack)

# 전체 typecheck (24개 workspace 전부: apps/web + 3 packages + 21 games -1 workspace 명명 관례 차이로 실제로는 25개 내외)
npm run typecheck

# lint (apps/web만 — 게임 패키지들은 별도 lint 스크립트 없음)
npm run lint

# 프로덕션 빌드
npm run build

# 게임 썸네일/갤러리 이미지 재생성 (새 게임 추가 시, 또는 아이콘 함수 수정 시)
node scripts/generate-thumbnails.mjs
```

**환경 변수** (`apps/web/.env.local`, git에는 커밋 안 됨 — `apps/web/.env.local.example` 참고):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # publishable/anon 키, 클라이언트에 노출되어도 안전
SUPABASE_SECRET_KEY=                 # 서버 전용, 절대 커밋/노출 금지. 현재 실사용처 없음 (Sprint 11 Cloud Save 대비용으로 예약됨)
```
이 값들은 로컬 `.env.local`에 이미 설정되어 있을 것입니다(직접 값을 확인하지는 않았습니다 — 시크릿이라 출력 금지 정책).

### Vercel / Supabase 연결 방식 (대시보드 기반 — CLI 링크 없음)

**이 프로젝트는 Vercel/Supabase를 로컬 CLI로 "링크"한 적이 없습니다.** Cursor나 다른 툴이 `.vercel` 폴더나 `supabase/config.toml`을 찾고 있다면 존재하지 않는 게 정상입니다 — 둘 다 대시보드 기반으로만 연결되어 있습니다.

| 찾고 있을 만한 것 | 실제 존재 여부 |
|---|---|
| `.vercel/` 폴더 (Vercel CLI 링크) | ❌ 없음 — `vercel link`/`vercel` CLI를 로컬에서 쓴 적 없음 |
| `supabase/config.toml` (Supabase CLI 링크) | ❌ 없음 — `supabase link`/`supabase db push`를 쓴 적 없음 |
| `apps/web/vercel.json` | ✅ 있음 — `{"installCommand": "npm ci"}` 한 줄뿐, 프로젝트 ID/연결 정보 없음 |
| `apps/web/.env.local` | ✅ 있음 (git-ignored) — Supabase URL/키가 여기 들어 있음 |
| `supabase/migrations/*.sql` | ✅ 있음 — SQL 파일로 버전 기록만, CLI 마이그레이션 이력 아님 |

**Vercel**: GitHub 앱 연동 방식입니다. `main` 브랜치에 push하면 Vercel이 자동으로 감지해서 배포합니다. 프로젝트명 `game29`, 팀 `jyp-ai1s-projects`. 로컬에 프로젝트 ID/토큰 파일이 없으므로, 배포 상태 확인은 [Vercel 대시보드](https://vercel.com)에서 직접 하거나, CLI를 쓰려면 `npx vercel link`로 새로 연결해야 합니다(Hobby 플랜이라 팀 멤버 초대가 안 되므로, 개인 액세스 토큰을 발급받아 `vercel --token <token>` 형태로 매번 넘겨야 함).

**Supabase**: 마이그레이션은 `supabase/migrations/*.sql` 파일로 **버전 기록만** 되어 있고, `supabase db push` 같은 CLI 명령으로 적용된 적이 없습니다. 지금까지의 방식은 **매 스프린트마다 Supabase 대시보드 → SQL Editor에 파일 내용을 직접 붙여넣어 실행**하는 것이었습니다. 프로젝트 연결 정보는 `apps/web/.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`에 있습니다. 대시보드: `https://supabase.com/dashboard/project/fecwbzyuktkzrbqqxtid`.

**마이그레이션 적용 절차** (CLI 없이, 지금까지 9번 전부 이 방식):
1. Supabase 대시보드 로그인 → SQL Editor 열기
2. `supabase/migrations/0009_sprint10.sql` 파일 내용 복사 → 붙여넣기 → Run
3. 에러 없이 완료되면 `get_my_rank` RPC와 SameGame/Arkanoid DX 게임 row가 생성됨

## 3. 저장소 구조 상세

```
game-platform/
├── apps/web/                    # Next.js 16 App Router 메인 앱
│   ├── app/                     # 라우트 (page.tsx, games/[slug], categories/[slug], profile, favorites, search 등)
│   ├── components/              # 앱 전용 클라이언트/서버 컴포넌트
│   ├── lib/
│   │   ├── supabase/            # client.ts, games.ts, categories.ts, scores.ts, plays.ts
│   │   ├── playable-games.ts    # PLAYABLE_SLUGS 배열 (서버 세이프 슬러그 화이트리스트)
│   │   ├── local-storage.ts     # 즐겨찾기/최근플레이 등 (게임 무관 앱 레벨 localStorage)
│   │   ├── game-sections.ts     # selectFeatured/selectNew/selectPopular/selectHotSlugs/selectByTag/selectByCategorySlug 등 홈페이지 큐레이션 로직
│   │   ├── site-config.ts       # 브랜드명/태그라인/키워드 중앙화
│   │   └── use-count-up.ts      # 숫자 카운트업 애니메이션 훅
│   ├── .env.local(.example)
│   ├── CLAUDE.md → @AGENTS.md
│   └── AGENTS.md                # "Next.js 16 breaking changes 주의" + "Auto Mode Active" 지침
├── packages/
│   ├── game-sdk/src/            # 7절에서 전체 모듈 상세
│   ├── ui/src/                  # button.tsx, progress.tsx, score-box.tsx, game-over-overlay.tsx, container.tsx, section-title.tsx, badge.tsx 등
│   └── shared/src/types.ts      # Game, Category, GameStatus, Difficulty 등
├── games/<slug>/                # 21개, 전부 동일 구조
│   ├── package.json             # name: "@game-platform/game-<slug>"
│   ├── tsconfig.json             # tsconfig.base.json 확장
│   └── src/
│       ├── engine.ts             # 순수 함수 게임 로직 (상태/리듀서/충돌판정 등, React 의존 없음)
│       ├── <Name>.tsx             # "use client" 컴포넌트, Save SDK 4종 세트 포함
│       └── index.ts               # export { <Name>Game } from "./<Name>"
├── supabase/migrations/0001~0009.sql
├── scripts/generate-thumbnails.mjs
├── docs/sprint-10-plan.md         # Sprint 10 상세 설계 원본 (참고용)
└── HANDOFF.md                     # 이 문서
```

## 4. 핵심 아키텍처 패턴 (반드시 이해하고 시작할 것)

### 4.1 game-sdk의 "3개 범용 훅 포인트"
플랫폼 전체에서 게임 플레이 이벤트를 감지하는 지점은 **정확히 2개 파일**뿐입니다:
- `apps/web/components/recently-played-recorder.tsx` — 게임 페이지 진입 시 (session-start 훅)
- `packages/game-sdk/src/context.tsx` — `GameSDKProvider`의 `reportScore`(점수 보고) / `handleSubmit`(랭킹 제출) 내부 (score-report, ranking-submitted 훅)

새로운 참여 유도 기능(미션, 시즌, 출석보상, 주간미션 등)을 추가할 때마다 이 2개 파일에 `record*` 호출을 나란히 추가하는 것이 Sprint 6부터 Sprint 10까지 6번 이상 반복 검증된 확립된 패턴입니다. **새 훅 파일을 만들지 말고 반드시 이 2곳에 추가하세요.**

현재 `recently-played-recorder.tsx`의 session-start 훅에 걸려있는 호출들 (순서대로):
```tsx
recordPlayed(slug);                              // local-storage.ts, 앱 레벨 최근플레이
recordSessionStart(slug, categorySlug);           // engagement.ts, 평생 XP
claimDailyReward();                                // daily-reward.ts, 출석보상 (streak는 recordSessionStart 내부에서 먼저 갱신되므로 반드시 그 다음에 호출)
recordMissionSessionStart(slug, categorySlug);    // missions.ts, 일일미션
recordWeeklyMissionSessionStart(slug, categorySlug); // weekly-missions.ts, 주간미션
recordSeasonSessionStart();                        // season.ts, 시즌 XP
```

`context.tsx`의 `reportScore` 훅에 걸려있는 호출들:
```tsx
recordScoreReport(gameSlug, score);        // engagement.ts
recordMissionScoreReport(gameSlug, score); // missions.ts
recordWeeklyMissionScoreReport(gameSlug, score); // weekly-missions.ts
recordSeasonScoreReport();                  // season.ts
// score > 기존 best일 때만:
recordNewBest(gameSlug, score);             // engagement.ts
recordSeasonNewBest();                       // season.ts
```
`handleSubmit`(랭킹 제출)에는 `recordRankingSubmitted()`만 있음 (season.ts 쪽 대응 함수는 **의도적으로 없음** — 아래 4.2 참고).

### 4.2 XP 소유권 역전 패턴 (XP-ownership inversion)
`engagement.ts`(레벨/XP/업적)만이 실제로 XP를 증가시키는(`addXP()`) 유일한 모듈입니다. `missions.ts`, `weekly-missions.ts`, `daily-reward.ts`, `season.ts` 같은 "XP를 주고 싶은" 다른 시스템들은 **직접 XP 함수를 호출하지 않고**, `emitEngagementEvent()`로 이벤트만 발행합니다. `engagement.ts`와 `season.ts`가 각각 자신의 `subscribeEngagementEvents()` 구독 콜백 안에서 반응합니다.

```
missions.ts / weekly-missions.ts / daily-reward.ts
        │
        │ emitEngagementEvent({type: "...-completed"/"daily-reward-claimed", xp})
        ▼
┌───────────────────────┬────────────────────────┐
│ engagement.ts (구독)   │  season.ts (구독)        │
│ addXP(event.xp)        │  addSeasonXP(event.xp)  │
└───────────────────────┴────────────────────────┘
```

**중요한 함정 (Sprint 10에서 실제로 2번 겪은 버그)**:
1. `engagement.ts`의 4개 훅 함수 중 `recordRankingSubmitted()`만 XP를 직접 주지 않고 업적(`first-ranking`) 언락만 시킵니다(1회성). 새 병렬 XP 트랙(`season.ts`)을 만들 때 이 함수의 대응물(`recordSeasonRankingSubmitted`)을 무조건 만들어서 매번 XP를 주면 **중복 지급**됩니다 — 업적 언락은 이미 `achievement-unlocked` 이벤트로 한 번만 잡히기 때문. 실제로 이 버그를 만들었다가 발견하고 해당 함수 자체를 제거했음.
2. 업적 언락(`unlockAchievement()`)은 `engagement.ts` 내부에서만 결정되고, 3개 훅 포인트 중 어디에도 직접 노출되지 않습니다 — 오직 `achievement-unlocked` 이벤트로만 관찰 가능. 새 병렬 XP 트랙이 평생 XP와 정확히 비례해서 늘어나려면 `mission-completed`/`weekly-mission-completed`/`daily-reward-claimed`뿐 아니라 **`achievement-unlocked`도 반드시 구독**해야 함 (`season.ts`가 이 4가지를 전부 구독하는 것이 정답 형태).
3. `engagement-events.ts`에 새 이벤트 타입을 추가하면 `apps/web/components/toast/toast-item.tsx`의 `toastContent()` switch문에도 케이스를 추가해야 타입에러 없이 exhaustive하게 처리됩니다 (TypeScript가 강제함).

### 4.3 저장/재개(Save & Resume) 시스템
- `packages/game-sdk/src/save.ts` — `saveGame`/`loadGame`/`clearSave`/`hasSave`/`subscribeSave`/`getSaveUpdatedAt`
- 봉투 구조: `SaveEnvelope<T> = {version, updatedAt, deviceId, state}` (현재 버전 2 — Sprint 10에서 `deviceId` 필드 추가, Cloud Save 대비)
- `MIGRATIONS` 레코드로 버전간 마이그레이션 (현재 `1: v1→v2`만 존재 — v1 봉투를 읽을 때 `deviceId`를 이 기기의 device_id로 채워서 v2로 승격)
- 마이그레이션은 **읽을 때(on-read) 적용되고, 실제 localStorage에 다시 쓰이는 건 다음 saveGame() 호출 시점**(다음 자동저장 tick) — 설계상 의도된 동작.
- 모든 게임은 다음 4종 세트를 리듀서/컴포넌트에 동일한 패턴으로 사용:
  ```tsx
  const { phase, initialState, phaseRef, onResume, onNewGame } = useResumableGame(GAME_SLUG, createInitialState);
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveStatus = useAutoSave(GAME_SLUG, () => (state.status !== "playing" ? null : state), [state]);
  // JSX 안에:
  <SaveIndicator status={saveStatus} slug={GAME_SLUG} />
  {phase === "resume-prompt" ? <ResumeDialog gameTitle="..." onResume={onResume} onNewGame={onNewGame} /> : null}
  ```
- `useAutoSave`: state 변경 후 300ms 디바운스 저장 + 5초 하드 인터벌 폴백. 저장 시 `saveStatus`가 "saving" → "saved"(0.8초 플래시) → 이후 `SaveIndicator`가 자체적으로 `getSaveUpdatedAt`/`subscribeSave`를 구독해서 "저장됨 · n초 전"을 1초마다 틱하며 표시(Sprint 10에서 추가된 부분 — 이전에는 0.8초 후 완전히 사라졌음).
- 가장 단순한 참고 예시: `games/memory/src/Memory.tsx`. rAF 기반 물리 게임(공/패들 등) 참고 예시: `games/breakout/src/Breakout.tsx`, `games/arkanoid-dx/src/ArkanoidDx.tsx`.

### 4.4 `useSyncExternalStore` 안정성 규칙
`getServerSnapshot`은 **매번 같은 참조(reference)를 반환**해야 합니다(새 배열/객체 리터럴을 매번 생성해서 반환하면 안 됨). 안 지키면 React가 무한 루프 경고를 던집니다. `engagement.ts`의 `getLevelProgress()`, `season.ts`의 `getSeasonProgress()`가 "계산값을 모듈 스코프에 캐시해두고, 실제 XP 값이 바뀔 때만 재계산" 패턴의 정석 예시입니다. 새 파생 상태를 만들 때 이 패턴을 그대로 복사하세요.

### 4.5 "server snapshot = null 렌더" 패턴과 그 트레이드오프
`DailyChallengeCard`, `WeeklyMissionCard`, `PlayerRankCard` 등 localStorage 기반 카드들은 서버 렌더 시점엔 실제 데이터가 없으므로 `getServerXSnapshot()`이 빈 상태를 반환 → 컴포넌트가 `if (!state.xxx) return null;`로 아무것도 안 그리다가, 클라이언트 hydration 후 실제 localStorage 값을 읽고 나서야 콘텐츠가 나타납니다. 이 패턴 자체는 Sprint 7부터 반복적으로 검증된 정상 패턴이지만, **홈페이지에 이런 카드가 여러 개 쌓이면 Cumulative Layout Shift(CLS)가 누적되어 Lighthouse 성능 점수를 깎습니다** — Sprint 10에서 실측 확인됨(88점, 9절 참고). 근본 해결은 스켈레톤/고정 높이 예약 또는 아키텍처 변경이 필요하며 아직 안 함.

## 5. 되돌리면 안 되는 아키텍처 결정

### 5.1 로그인 없음 — device_id + 닉네임 (Sprint 3, 확정, PM이 명시적으로 재차 확인)
PM이 처음에는 Sprint 3을 Supabase Anonymous Auth(세션 기반 익명 로그인) 중심으로 설계했으나, **PM이 명시적으로 거부**했습니다. 이유: Re:Play의 핵심 루프는 "접속 → Play → 게임 → 점수 → 닉네임 입력 → 랭킹 등록"이며 계정(익명이라도)이 끼는 순간 90% 이상의 방문자 이탈 위험이 있다는 판단. 퍼즐 게임 특성상 "들어온다 → 1분 플레이 → 재미있다 → 계속한다"의 무중단 흐름이 절대적으로 중요.

실제 로그인(Google/Apple/Discord/GitHub OAuth)은 **Sprint 11**에서 "이미 참여 중인 유저에게 주는 혜택"(기기간 점수 동기화, 업적, 친구)으로 도입 예정 — "로그인은 기능이 아니라 혜택이 생겼을 때 도입"이라는 PM의 표현. **그 전까지는 재도입하지 말 것.**

- 현재 구조: `scores` 테이블은 `(device_id, game_slug)`당 1행 (PK). `device_id`는 클라이언트가 최초 방문 시 `crypto.randomUUID()`로 생성해 `localStorage`(`play29:device-id`)에 저장하는 UUID — Supabase 세션이 아님.
- `profiles`/`auth.users` 테이블 자체가 없음. `games`, `scores`, `categories`, `settings` 4개 테이블이 확정된 최소 스키마(Sprint 3 시점).
- 흐름: 게임 종료 → 로컬 저장된 개인 최고점을 넘으면 → 닉네임 모달("🎉 최고기록! 닉네임을 입력하세요") → `submit_score` RPC(atomic "더 높은 점수만 갱신" upsert) 호출. 마지막 사용한 닉네임을 localStorage에서 프리필하되 항상 재입력 가능 — "로그인할 지속적 정체성"이 없음.
- 만약 이후 세션에서 Supabase Auth 코드나 `profiles` 테이블 참조를 어딘가에서 발견하면, 이 메모가 갱신되지 않은 이상 **오래되어 이미 제거된 것으로 간주**하세요.

### 5.2 브랜드는 "Re:Play" (Sprint 5, 확정)
`apps/web/lib/site-config.ts`에 이름/태그라인/서브태그라인/키워드가 중앙화되어 있음. 새 페이지/컴포넌트에서 브랜드명이 필요하면 반드시 여기서 import — 하드코딩 금지.

**단, `localStorage` 키 프리픽스는 `play29:`로 의도적으로 그대로 유지**(즐겨찾기, 최근플레이, 최고점수, device_id, 최근검색어 전부). 리네임하면 기존 방문자의 저장 데이터가 고아가 되고, 최악의 경우 자신의 `scores` row에 새 device_id로는 접근 불가능해지는 데이터 유실이 발생함. **영구 고정으로 취급, 나중에 "정리"할 TODO가 아님.**

### 5.3 다크 테마 단일 고정 (Sprint 5, 확정)
라이트모드 없음. `apps/web/app/globals.css`의 `:root`와 `.dark` 블록이 완전히 동일한 값. `layout.tsx`의 `<html>`에 영구적으로 `dark` 클래스가 박혀있음. 브랜드 토큰: `--primary`(#5B5BD6 인디고), `--brand-amber`(#FFB800), 배경 #0F172A, 카드 #1E293B.

### 5.4 새 FK로 인한 Supabase embed 충돌 주의 (Sprint 5에서 실제로 겪음)
`categories.featured_game_id → games.id`를 `games.category_id → categories.id`에 이어서 추가했더니 "Could not embed because more than one relationship was found" 에러가 발생. **두 테이블 사이에 이미 embed로 쓰이는 FK가 있는 상태에서 두 번째 FK를 추가하면 반드시 발생하는 문제** — 해결은 select 문자열에 FK 이름 힌트를 명시: `categories!category_id(name, slug)` (`apps/web/lib/supabase/games.ts` 참고). 앞으로 두 테이블 사이에 관계를 하나 더 추가할 때마다 동일한 처리가 필요함을 기억할 것.

## 5.5 Supabase 마이그레이션 0001~0009 한눈에 보기

| 파일 | 한 줄 요약 |
|---|---|
| `0001_init.sql` | `games`/`categories`/`settings` 테이블 최초 생성 (Sprint 1) |
| `0002_sprint2.sql` | `games.category_id` 추가, featured 플래그, 2048 최초 시드 (Sprint 2) |
| `0003_sprint3.sql` | **로그인 없는 스코어보드 확정** — `device_id` 기반 identity, `scores` 테이블, `submit_score`/`get_leaderboard` RPC (Sprint 3, 5.1절 아키텍처 결정의 근거) |
| `0004_sprint4.sql` | 검색용 `tags`, 게임 상세용 `how_to_play` 컬럼 + 4개 신규 게임 카테고리 배정 (Sprint 4) |
| `0005_sprint5.sql` | Re:Play 리브랜딩, 카테고리 배너/설명/featured game, 레트로 아케이드 10개 신규 게임 (Sprint 5) |
| `0006_sprint5_v2.sql` | 실제 인기도 신호(`play_count`), 추억 이야기(`nostalgia_note`) 스키마, Air Hockey 게임 (Sprint 5-v2) |
| `0007_sprint5_v3.sql` | Coming Soon 플레이스홀더, 추억 이야기 커버리지 확장 (Sprint 5-v3) |
| `0008_sprint9.sql` | Retro/Sports 카테고리 추가, Tetris/Gold Miner/Space Impact 3개 신규 게임, Olympic 게임 재분류 (Sprint 9) |
| `0009_sprint10.sql` | `get_my_rank` RPC(개인 순위), SameGame/Arkanoid DX 게임 row (Sprint 10) |
| `0010_sprint11.sql` | `analytics_events` 테이블 + `track_analytics_event` RPC + Admin 집계 함수 (Sprint 11) |
| `0011_platform_tables.sql` | `players`, `sessions`, `game_sessions`, `leaderboards`, `matches` + 백필 |
| `0012_analytics_event_types.sql` | analytics event_type 확장 (game_start, ranking_submit, favorite 등) |
| `0013_dashboard_rpcs.sql` | Executive Dashboard RPC (KPI · Funnel · Cohort · Heatmap) — **⚠️ 0011 players 테이블 필요** |

> `docs/sprint-10-plan.md`는 계획 단계의 설계 초안입니다 — 그 안의 `get_my_rank` SQL 스니펫은 **미랭킹 기기에 대해 null 대신 거짓 "1등"을 반환하는 버그가 있던 초안**입니다. 실제로 커밋된 `supabase/migrations/0009_sprint10.sql`의 함수는 서브쿼리 조인 방식으로 이 버그를 고친 최종본이니, 실행할 때는 반드시 `supabase/migrations/0009_sprint10.sql` 쪽을 사용할 것 — `docs/sprint-10-plan.md`는 설계 의도 참고용일 뿐 실행용이 아닙니다.

## 6. 스프린트 1~10 전체 상세 히스토리

### Sprint 1 — 플랫폼 기초 골격
Next.js 프로젝트 구조, npm workspaces 세팅, Header/Hero/Footer, Supabase 최초 연동, SEO 메타데이터/sitemap/robots. `packages/game-sdk`의 `GameModule`/`registerGame`/`getGames` 메타데이터 레지스트리는 이후 죽은 코드로 판명되어 Sprint 2에서 제거됨.

### Sprint 2 — 첫 게임(2048) 출시
gabrielecirulli/2048(MIT 라이선스) 포팅, Play29 스타일 적용. LocalStorage 기반 즐겨찾기/최근플레이만 있고 실제 랭킹/로그인/광고/기기간 동기화는 아직 없음. `games/brick-puzzle`(Sprint 1의 빈 스캐폴드)은 실제 코드가 없어 삭제 — Supabase에는 COMING_SOON 상태로만 남음. `ssr:false in next/dynamic`은 Server Component에서 호출 불가하다는 Next 16 제약을 발견 — `game-player.tsx` 패턴(작은 "use client" 파일이 dynamic() 호출을 전담, Server Component는 슬러그 화이트리스트만 체크) 확립. Tailwind v4의 `@source`가 워크스페이스 하위 패키지를 스캔하려면 명시적 글롭이 필요함을 발견(`@source "../../../games/*/src/**/*.{ts,tsx}"`).

### Sprint 3 — 공유 SDK: 랭킹 + 점수저장 (아키텍처 반전 발생)
최초 계획(Supabase Anonymous Auth)이 PM에 의해 거부되고 device_id+닉네임 방식으로 완전히 재설계됨(5.1 참고). `packages/game-sdk`에 실질적인 첫 공유 서비스(`context.tsx`, `local-storage.ts`, `nickname-modal.tsx`) 구현. `apps/web/lib/supabase/scores.ts`(submitScore/getLeaderboard) 작성. 2048에 `reportScore`/`getBestScore` 연동.

### Sprint 4 — 콘텐츠 플랫폼화
Snake/Breakout/Memory/Minesweeper 4개 신규 게임(2048 포함 총 5개). 게임 레지스트리 구조 확립(자동 discover `transpilePackages`). 검색(헤더 입력 + `/search` 페이지), 카테고리 페이지, 게임 상세 페이지 강화(배너/how-to-play/카테고리/내 최고점수), 썸네일 5개 생성.
**중요 버그 발견**: "제로터치 게임 레지스트리"에 예외가 하나 있음 — **로컬은 루트 `npm install`이 모든 `games/*`를 무조건 링크하지만, Vercel은 `apps/web`을 Root Directory로 install하기 때문에 `apps/web/package.json`에 실제 의존성으로 선언되지 않은 게임 패키지는 배포에서 "Module not found"로 실패**함. Snake/Breakout/Memory/Minesweeper가 이 문제로 배포 실패했다가 각각을 `apps/web/package.json`에 추가하고 나서야 해결됨. **로컬 빌드 성공이 배포 성공을 보장하지 않는다**는 교훈이 이후 모든 스프린트의 새 게임 추가 시 체크리스트에 포함됨(2절 참고).

### Sprint 5 — Play29 → Re:Play 리브랜딩 + 레트로 아케이드 컬렉션
10개 신규 오리지널 게임(총 15개): Maze Runner, Tank Battle, Galaxy Defender, Space Defender, Bubble Pop, Sudoku, Tic Tac Toe, Simon, Hangman, Color Match. 장르가 겹치는 두 쌍은 의도적으로 다른 핵심 메커니즘으로 설계됨 — Galaxy Defender(갤러그식 대형+급강하)와 Space Defender(스페이스 인베이더식 고정 그리드, 개체수 줄수록 가속), Simon(순서기억)과 Color Match(반사신경). 6개 카테고리 시스템, Netflix식 캐러셀 홈페이지, 검색 자동완성/히스토리, 스크린샷 갤러리. 브랜드 전환(5.2 참고), 다크테마 고정(5.3 참고). "Action" 카테고리는 Tank Battle 하나뿐인 의도적으로 얇은 상태 — PM의 "브랜드 경험 > 게임 개수" 우선순위에 따른 수용된 갭, Sprint 6에서 채우기로 계획했으나 실제로는 Sprint 6에서 다른 것을 함.
**루트 loading.tsx 버그**: Next.js 16 App Router에서 루트 레벨 `app/loading.tsx`를 추가했더니 모든 라우트에서 `<main>` 엘리먼트가 중복 생성됨(하드 리로드 시 재현, React Suspense/streaming이 깔끔하게 스왑을 못함) — 딥 디버깅 대신 제거함. **앞으로도 루트 loading.tsx는 재도입 전에 `document.querySelectorAll('main').length === 1`로 반드시 검증할 것.**

### Sprint 5-v2 — 홈페이지 재구조화
`page.tsx`/`/favorites`/`/games` 라우트 재편, Air Hockey 추가, `selectPopular`가 실제 `play_count`(페이지뷰마다 증가) 기반으로 동작하도록 개선, 게임카드 리디자인(NEW/HOT 배지, 플레이수, 최고점수, 호버 Play), Hero 리디자인(픽셀 그리드, 네온 글로우), 게임 상세 페이지 순서 변경 + 추억 노트 컴포넌트, 브랜드 파비콘, per-게임 OG 이미지/JSON-LD.

### Sprint 5-v3 — 폴리시 라운드
Coming Soon 플레이스홀더(추억의 오락실 섹션), Lighthouse 성능 회귀 수정(99→92), 나머지 게임들에 "추억 이야기" 문구 확장, 선택적 사운드 이펙트 추가.

### Sprint 6 — Engagement SDK 기반 (XP/레벨/업적)
`packages/game-sdk`에 `engagement.ts` 신설 — XP/레벨/업적/일일 스트릭의 최초 구현. **3개 범용 훅 포인트 확립**(4.1 참고) — 이후 모든 참여 유도 기능이 이 패턴을 그대로 재사용. 토스트 알림 UI(`toast-item.tsx`/`toast-host.tsx`), 헤더 레벨 배지 도입.

### Sprint 7 — Daily Mission (일일미션)
`missions.ts` 신설. **XP 소유권 역전 패턴 최초 확립**(4.2 참고) — 미션 시스템은 XP를 직접 주지 않고 `mission-completed` 이벤트만 발행, `engagement.ts`가 구독해서 반응. 레벨 티어별로 다른 미션 풀(`getMissionTierForLevel`), 날짜+티어 기반 결정론적 시드 셔플(`mulberry32` PRNG + `seedFromDate`/`pickThree`) — 이 로직이 Sprint 10의 Weekly Mission에서 그대로 재사용(export만 추가)됨. Daily Challenge Card UI.

### Sprint 8 — Player Hub
프로필 라우트 + 닉네임 편집, 통계 + 업적 갤러리, Continue Playing 카드 개선("이어하기" 표시가 실제 진행상황 존재 여부를 반영하도록), 즐겨찾기 정렬 개선, 헤더 레벨 배지 확장. 공유 `Progress` 컴포넌트에 접근성 이름(accessible name) 추가하는 수정(리더보드 탭의 색상 대비 이슈와는 별개).

### Sprint 9 — Save & Resume 전체 게임 통합 + 레트로 확장
당초 "저장 SDK만"으로 스코프됐다가 PM이 "저장 기능과 함께 콘텐츠 가치도 같이 올라가야 한다"며 중간에 확장:
- **Save SDK**(`save.ts`/`use-auto-save.ts`/`use-resumable-game.ts`/`resume-dialog.tsx`/`save-indicator.tsx`) 신설, 5개 기존 게임(2048/Snake/Memory/Minesweeper/Breakout)에 전부 통합.
- "이어하기" 라벨이 실제 저장 데이터가 있을 때만 뜨도록 정직하게 수정("플레이" vs "이어하기").
- 신규 게임 3개: Tetris, Gold Miner, Space Impact (PM이 원래 요청한 5개 중 Sudoku/Bubble Pop은 이미 존재했음을 확인하고 3개로 조정).
- Retro + Sports 카테고리 추가(6개 → 8개 유지), 홈페이지 순서 재배치.
- 플랫폼 전체의 WCAG 색상 대비(WCAG contrast) 문제(ScoreBox/리더보드 탭 텍스트)를 발견했지만 이번 스프린트 범위 밖이라 별도 백그라운드 태스크로 분리 처리(Sprint 10에서 실제로 고침).
- `git push origin main`이 "auto mode classifier"에 의해 처음 차단되고 사용자 재승인을 받아야 했음(9절에서 상세).

**Sprint 9 종료 후 PM 리뷰 (9.6/10)**: Save SDK → useAutoSave → Resume Hook → Resume Dialog → 게임 통합 체인 아키텍처는 승인. 5가지 개선 제안:
1. 저장 로직이 게임마다 개별 `useResumableGame()` 호출 방식 — 향후 `createPlayableGame({...})` 통합 래퍼 제안 (Sprint 11 후보, 아직 미착수)
2. `SAVE_VERSION=1`의 마이그레이션 로직이 스캐폴드뿐 — **Sprint 10에서 반드시 실제 v1→v2 마이그레이션 구현할 것**(비협상, Sprint 10에서 완료함)
3. Save Indicator가 "Saved"만 보여줌 — "Saved · N초 전"으로 개선 요청(Sprint 10에서 완료)
4. Continue Playing이 레벨/점수/미션 정보를 같이 보여주면 좋겠음(Sprint 10에서 완료)
5. 홈이 너무 길어지고 있음 — Tab 구조 제안(Sprint 10에서는 코멘트로만 취급, 실제 개편은 안 함, 아직 미착수)

### Sprint 10 — Season & Competitive Loop (방금 완료, 이 문서 작성 시점 기준 최신)
PM의 명시적 결론: "이제는 게임 수를 빠르게 늘리는 것보다 플레이어가 돌아오는 이유(시즌, 경쟁, 보상, 랭킹)를 만드는 기능에 집중." PM 우선순위: Season/Weekly Mission/Leaderboard = ★★★★★, Challenge/Daily Reward/Player Rank = ★★★★☆, Replay = ★★★☆☆, Friend = ★★☆☆☆, Cloud Save는 명시적으로 제외(Sprint 11로).

**계획 단계에서 사용자와 확정한 3가지 스코프 결정** (모두 추천 옵션 선택):
1. Epic 6 게임 후보(Arkanoid DX/SameGame/Simon) 중 Simon은 이미 Sprint 5에 존재, Arkanoid DX는 Breakout과 거의 겹침 → **SameGame만 순수 신규로 제작**, Simon 드롭, Arkanoid DX는 별도 패키지로 만들되 파워업+멀티스테이지로 진짜 차별화.
2. "카테고리별 랭킹"은 게임마다 점수 스케일이 근본적으로 달라(2048 수천점 vs 틱택토 승수) 크로스게임 집계가 불가능 → **카테고리의 게임들을 묶어서 각자의 기존 리더보드를 보여주는 UI**로 결정, 새 집계 스키마 아님.
3. PM의 "홈 → Tab" 코멘트는 6대 에픽에 포함 안 된 코멘트일 뿐 → 이번 스프린트는 Epic 5의 카드만 추가, 홈페이지 전체 IA 개편은 미래 스프린트로 연기.

**구현 내역** (6.1~6.8 소절):

**6-1. Season System**: `season.ts` — `CURRENT_SEASON = {id: "season-1", label: "Season 1"}`, localStorage 키가 `play29:season-xp:${CURRENT_SEASON.id}`라 새 시즌 도입은 그냥 새 키(0 XP부터 시작, 마이그레이션 불필요) — "리셋 구조는 준비, 실제 리셋 로직은 미구현"이라는 PM 요구를 정확히 만족. `SEASON_BADGE_TIERS = [{level:5,"Bronze"},{level:10,"Silver"},{level:20,"Gold"}]`, 순수 파생값(별도 언락 상태 저장 없음). 홈페이지 Season Card(`<Progress>` 재사용, header-level-badge와 시각적으로 통일).

**6-2. Weekly Mission**: `weekly-missions.ts` — `missions.ts`에서 `mulberry32`/`pickThree`/`seedFromDate`/각 팩토리 함수(`playCountMission`/`categoryPlayMission`/`anyPlayMission`/`scoreMission`/`clearMission`)를 export로 전환해 그대로 재사용, 시드만 날짜 문자열 대신 ISO 주차 문자열(`isoWeekString`, 예: "2026-W30")로 교체. 일일미션과 달리 **미션 1개만**(누적形), 목표치가 더 큼(20~40회 vs 일일 1~3회). Weekly Mission Card UI(Daily Challenge Card의 근접 복제).

**6-3. Save 마이그레이션 v1→v2 + 실시간 인디케이터**: `SAVE_VERSION`을 2로 올리고 `deviceId` 필드를 봉투에 추가, `MIGRATIONS[1]`을 실제 구현(v1 봉투를 만나면 이 기기의 device_id로 채워서 승격). 테스트 러너가 없는 환경이라 `npx tsx`로 실제 `save.ts` 모듈을 동적 import해서 raw v1 봉투 작성 → `loadGame()` → v2 승격 확인 → `saveGame()` → 디스크 반영 확인의 4단계를 스크래치패드 스크립트로 검증(일회성, 영구 테스트 아님). `SaveIndicator`가 `getSaveUpdatedAt`/`subscribeSave`를 직접 구독해서 "저장됨 · n초 전"을 1초 간격으로 갱신 표시하도록 개선 — 8개 기존 게임 전부의 `<SaveIndicator status={...} />` 호출에 `slug={GAME_SLUG}` prop을 추가해야 했음(기계적 작업이지만 8개 파일 전부 수정 필요).

**6-4. Daily Reward**: `daily-reward.ts` — `engagement.ts`의 기존 `DailyStreakState`를 재사용(별도 스트릭 추적 안 함). `recordSessionStart` 이후에 호출해야 그날의 갱신된 스트릭을 읽을 수 있음(순서 중요, 4.1 참고). 1~6일차는 20XP 고정, 7일차 이상은 100XP 보너스 + 별도 토스트("7일 연속 출석 보너스!"). 시뮬레이션으로 검증: localStorage의 `daily-streak` 상태를 직접 조작해 스트릭을 6→7로 만든 뒤 실제 브라우저에서 XP/토스트 확인.

**6-5. Leaderboard 확장**: `scores.ts`의 `LeaderboardPeriod`에 `"weekly"` 추가(월요일 시작 주간 컷오프, `get_leaderboard` RPC는 이미 임의의 `p_since` 컷오프를 지원해서 **스키마/RPC 변경 전혀 불필요**, 클라이언트 헬퍼만 추가). "Top100 API 구조"도 `get_leaderboard`의 `p_limit` 기본값이 이미 100이라 이미 충족된 상태였음(중복 구현 안 함, 리포트에 명시). 신규 `get_my_rank(p_game_slug, p_device_id, p_since)` RPC — **주의**: 단순히 `count(*) + 1 where score > (서브쿼리)` 형태로 짜면 서브쿼리가 빈 결과일 때 비교가 unknown이 되어 count가 0이 되고 결과가 `1`(거짓 "1등")이 되어버림 — 실제로 이 버그를 짰다가 발견하고 `from (내 점수 서브쿼리) my` 조인 형태로 재작성해서 진짜로 빈 결과가 함수 결과 자체를 null(비어있음)로 만들도록 고침. 리더보드 탭에 기존부터 있던 WCAG 대비 문제(`text-muted-foreground` on `bg-muted`, 4.03:1)를 `text-slate-300`으로 교체해 실측 ~6.97:1로 개선(Sprint 9에서 발견만 하고 미룬 것을 이번에 실제로 고침, Lighthouse accessibility 100점 확인).

**6-6. Category Leaderboard**: `category-leaderboard.tsx` — 카테고리 페이지에 추가, ACTIVE 상태 게임만(Coming Soon 제외) 각자의 top3 + 내 순위 미니 리더보드를 그리드로 표시.

**6-7. Competitive UI 카드 + Continue Playing 개선**: `season-card.tsx`, `player-rank-card.tsx`(가장 많이 플레이한 상위 2개 게임의 내 순위) 홈페이지 추가. `continue-playing-card.tsx`가 `getLevel()` + `getBestScore(game.slug)`를 상대 시간과 함께 표시하도록 개선.

**6-8. 신규 게임 2개**:
- **SameGame** (`games/samegame/`): 같은 색 인접 타일(2개 이상) 클릭 제거, 그룹 클릭 시 flood-fill(BFS)로 그룹 찾기 → 제거 → 중력(컬럼 내 낙하) → 컬럼 붕괴(빈 컬럼은 오른쪽으로 밀림)의 전형적 SameGame 규칙. 점수 공식 `size*(size-1)*5`(2타일=10점, 5타일=100점, 점점 초선형). 클리어 가능한 그룹이 더 없으면 게임 종료. 턴제(rAF 불필요)라 Memory/Minesweeper에 더 가까운 형태.
- **Arkanoid DX** (`games/arkanoid-dx/`): Breakout 엔진 형태(패들+공+벽돌)를 베이스로 하되 **3단계 스테이지 진행**(패턴 3종: 풀그리드/다이아몬드/체커보드, 특정 두 벽돌 인덱스는 모든 패턴에서 항상 생존하도록 설계해 파워업이 매 스테이지 확보 가능) + **2가지 파워업**(파란 캡슐=패들 확장 8초, 주황 캡슐=멀티볼 3개로 분열)을 실제 게임플레이 차별점으로 추가. 검증 중 실제 버그 발견: 패들 확장이 캡슐을 잡은 바로 그 프레임이 아니라 다음 프레임에야 반영되는 1프레임 지연 버그 — `finalPaddleWidth`를 캡슐 판정 이후에 재계산하도록 수정.

두 게임 모두 Save SDK를 처음부터 정식으로 탑재했고, 3개 훅 포인트를 통해 XP/시즌/미션과 별도 배선 없이 자동 연동됨.

**Sprint 10에서 QA 중 잡은 버그 요약** (전부 수정 완료):
1. Season XP가 업적/주간미션 언락 보너스를 놓치는 버그 (achievement-unlocked 이벤트 구독 누락)
2. `recordSeasonRankingSubmitted()` 중복 지급 버그 (함수 자체 제거)
3. `get_my_rank` SQL이 미랭킹 기기에 대해 null 대신 거짓 "1등"을 반환하는 버그 (서브쿼리 조인 구조로 재작성)
4. Arkanoid DX 패들 확장 1프레임 지연 버그 (`finalPaddleWidth` 재계산 시점 수정)

**Sprint 10 커밋/배포 상태**:
- 커밋: `124eac6` "feat: Sprint 10 Season & Competitive Loop (Season XP, Weekly Mission, Leaderboard expansion, Daily Reward, SameGame, Arkanoid DX)"
- `origin/main`에 push 완료 (2026-07-22, 사용자 재승인 후)
- Vercel은 GitHub 연동으로 push 시 자동 배포 (배포 완료 여부는 Vercel 대시보드에서 직접 확인 권장)

**Sprint 10 남은 작업(⚠️ Cursor에서 이어서 해야 함)**:
1. ~~**`supabase/migrations/0009_sprint10.sql` 실행**~~ — **완료** (0001~0009 전체 순서대로 적용됨). `get_my_rank` RPC 미배포 시 UI 동작: 게임 상세/카테고리 리더보드는 "내 순위" 줄 자체를 숨김(`myRank !== null`일 때만 렌더), 홈 `PlayerRankCard`만 **"미랭킹"** 텍스트를 표시 — RPC 404도 `.catch(() => {})`로 삼켜서 동일하게 null 취급.
2. **Lighthouse 성능 88점**(Sprint 9 시점 92점 대비 하락). accessibility/best-practices/SEO는 전부 100점(WCAG 대비 수정 확인됨). 원인은 CLS 0.102 — 홈페이지에 새로 추가된 카드 3개가 4.5절의 "server snapshot=null" 패턴을 각각 쓰면서 누적 효과. 이번엔 의도적으로 미수정(스코프 과다 확장 리스크 판단), 홈페이지 Tab 개편 시 함께 해결 권장.

## 7. packages/game-sdk 전체 모듈 맵

| 파일 | 역할 | 핵심 export |
|---|---|---|
| `context.tsx` | `GameSDKProvider`(닉네임 모달, reportScore/handleSubmit 훅 포인트) | `GameSDKProvider`, `useGameSDK`, `GameSDKAdapter` |
| `local-storage.ts` | 앱 레벨 localStorage 유틸(닉네임, 최고점수, device_id, 사운드 설정) | `getBestScore`, `getDeviceId`, `getLastNickname`, `setBestScore` 등 |
| `sound.ts` | 클릭/호버/시작 효과음 | `playClickSound` 등 |
| `engagement.ts` | 평생 XP/레벨/업적/일일스트릭 — **XP의 유일한 소유자** | `recordSessionStart/ScoreReport/NewBest/RankingSubmitted`, `getLevel`, `getLevelProgress`, `ACHIEVEMENTS`, `subscribeEngagement` |
| `engagement-events.ts` | 이벤트 버스(ephemeral pub/sub, 토스트용) | `EngagementEvent` union, `emitEngagementEvent`, `subscribeEngagementEvents` |
| `missions.ts` | 일일미션 — 결정론적 시드 셔플, 레벨 티어별 풀 | `getDailyMission`, `recordMissionSessionStart/ScoreReport`, 팩토리 함수들(`mulberry32`/`pickThree`/`seedFromDate` 포함, Sprint 10에서 export로 전환) |
| `weekly-missions.ts` | 주간미션 (Sprint 10 신규) — missions.ts 로직 재사용 | `getWeeklyMission`, `recordWeeklyMissionSessionStart/ScoreReport`, `isoWeekString` |
| `daily-reward.ts` | 출석 보상 (Sprint 10 신규) | `hasClaimedTodayReward`, `claimDailyReward` |
| `season.ts` | 시즌 XP/레벨/뱃지 (Sprint 10 신규, 평생 XP와 병렬 트랙) | `getSeasonProgress`, `getSeasonBadge`, `recordSeasonSessionStart/ScoreReport/NewBest`, `CURRENT_SEASON` |
| `save.ts` | 저장/재개 봉투 시스템, 버전 마이그레이션 | `saveGame`, `loadGame`, `clearSave`, `hasSave`, `getSaveUpdatedAt`, `SAVE_VERSION` |
| `use-auto-save.ts` | 디바운스+인터벌 자동저장 훅 | `useAutoSave`, `SaveIndicatorStatus` |
| `use-resumable-game.ts` | 초기 상태를 저장본 vs 새 게임 중 결정, Resume Dialog 게이팅 | `useResumableGame` |
| `resume-dialog.tsx` | "저장된 게임이 있어요" 다이얼로그 | `ResumeDialog` |
| `save-indicator.tsx` | "Saving...→Saved→저장됨·n초전" 인디케이터 | `SaveIndicator` |
| `nickname-modal.tsx` | 신기록 시 닉네임 입력 모달 | `NicknameModal` |

## 8. 게임 목록 및 게임 추가 표준 프로세스

### 8.1 현재 게임 목록 (21개)
2048, Snake, Breakout, Memory, Minesweeper, Maze Runner, Tank Battle, Galaxy Defender, Space Defender, Bubble Pop, Sudoku, Tic Tac Toe, Simon, Hangman, Color Match, Air Hockey, Tetris, Gold Miner, Space Impact, **SameGame**(Sprint 10 신규), **Arkanoid DX**(Sprint 10 신규)

### 8.2 게임 추가 표준 프로세스 (PM이 매번 요구하는 7단계)
1. 라이선스 검증(MIT/Apache/BSD만, GPL 등 카피레프트 거부) — 오픈소스 포팅 게임의 경우
2. React + TypeScript로 포팅/구현
3. `game-sdk` 적용 (4.1~4.4 패턴, 게임 전용 로직 지양 — Save SDK 4종 세트는 필수)
4. Supabase 점수 저장(Score API) 연동
5. Re:Play UI/테마 적용 (원본 게임의 스킨이 아니라 플랫폼 통일 테마)
6. 광고 Hook 추가 (아직 실제 광고 시스템은 없음 — 자리만 예약해두는 정도)
7. Git commit + Vercel 배포

### 8.3 새 게임을 추가할 때 반드시 건드려야 하는 파일 4곳
(하나라도 빠지면 로컬 빌드는 되지만 Vercel 배포만 실패하는 특이 케이스 — Sprint 4에서 처음 겪음, 6절 Sprint 4 참고)
1. `games/<slug>/` — 새 패키지 (`package.json`, `tsconfig.json`, `src/{engine.ts,<Name>.tsx,index.ts}`)
2. `apps/web/package.json`의 `dependencies`에 `"@game-platform/game-<slug>": "*"` 추가
3. `apps/web/lib/playable-games.ts`의 `PLAYABLE_SLUGS` 배열에 slug 추가
4. `apps/web/components/game-player.tsx`의 `gameComponents` 맵에 `dynamic(() => import(...), { ssr: false })` 항목 추가

그리고 **루트에서 `npm install`을 다시 실행**해야 새 workspace가 `node_modules`에 심볼릭 링크로 연결됨(안 하면 "Module not found"). 추가로 DB에 게임 row를 넣는 마이그레이션(썸네일도 `scripts/generate-thumbnails.mjs`에 아이콘 함수 추가 후 재실행) 필요.

## 9. 알려진 환경 이슈 / 함정 (전체, 반복해서 마주친 것들)

- **Windows/PowerShell 환경**: 포트 3000을 물고 있는 좀비 `node.exe` 프로세스가 가끔 남음 — `netstat -ano | findstr :3000` 후 `taskkill /F /PID <pid>`.
- **Lighthouse CLI 정리 단계에서 한글 경로 인코딩 에러**(`EPERM ... rmSync ... Users\<깨진한글>\...`)가 뜨지만 **JSON 리포트 자체는 정상적으로 파일에 써짐** — 무시하고 결과 파일을 직접 읽으면 됨. 매 스프린트 반복 발생하는 벤딩 이슈(chrome-launcher의 임시 디렉토리 정리 단계 실패, 리포트 생성 자체와는 무관).
- **미리보기(헤드리스) 브라우저 탭의 `document.hidden === true` 상태에서 `requestAnimationFrame`이 거의 실행되지 않음** — rAF 기반 물리 엔진(Breakout, Arkanoid DX 등)을 헤드리스 브라우저로 테스트하면 공/패들이 완전히 멈춘 것처럼 보이지만, 실제 코드 버그가 아니라 환경 제약(직접 `document.hidden`/`visibilityState` 확인해서 반복 검증됨). 사람이 직접 여는 실제 브라우저 탭에서는 정상 작동. 포인터/터치 입력(`pointermove` 등)은 rAF 루프와 무관하게 dispatch 즉시 반영되므로, 그 경로로 인터랙션 로직 자체는 헤드리스 환경에서도 검증 가능함(실제로 이 방법으로 우회 검증함).
- **Tailwind v4는 workspace 하위 패키지를 스캔하려면 `@source` 글롭 경로가 명시적으로 필요** (`apps/web/app/globals.css`의 `@source "../../../games/*/src/**/*.{ts,tsx}"` — 디렉토리 경로만 있고 글롭이 없으면 조용히 스캔 실패해서 스타일이 안 먹음).
- **이 프로젝트에는 테스트 러너(jest/vitest 등)가 전혀 없음.** 게임 엔진/마이그레이션 로직 검증은 매번 `npx tsx <스크래치패드>.ts`로 실제 소스 모듈을 동적 import(`pathToFileURL` 사용)해서 일회성으로 assert 스크립트를 돌리는 방식을 써왔음 (예: `save.ts`의 v1→v2 마이그레이션, SameGame의 flood-fill/중력/컬럼붕괴, Arkanoid DX의 스테이지 진행/파워업/승리조건). 톱레벨 await는 tsx의 기본 CJS 출력 모드에서 에러 나므로 `async function main() { ... } main();` 형태로 감싸야 함.
- **Git push to origin main은 매 스프린트 사용자 재승인이 필요** — "auto mode classifier"가 직전 스프린트의 승인을 이번 push에 자동으로 넘겨주지 않고 매번 새로 확인받아야 함(Sprint 9, Sprint 10 둘 다 겪음). Cursor로 옮기면 이 제약 자체가 없어질 가능성이 높음(Claude Code 고유의 안전장치).
- **Supabase RLS(Row Level Security)가 `games`/`categories`/`scores` 테이블에 걸려 있어서 anon 키로는 SELECT만 가능** — INSERT/새 함수 생성 등 스키마 변경은 대시보드 SQL Editor에서 직접 실행해야 함(2절: CLI 링크 없음, 수동 실행이 정상 워크플로). 서비스 롤/시크릿 키(`SUPABASE_SECRET_KEY`)가 있어도 운영 DB에 직접 쓰기는 위험한 작업으로 간주해 사용자 승인 없이 시도하지 않는 방식을 유지해옴 — Cursor에서도 이 원칙(마이그레이션은 사용자가 직접 대시보드에서 실행)을 유지하는 것을 권장.
- **`preview_screenshot`/헤드리스 브라우저 도구가 가끔 30초 타임아웃**되는 경우가 있었음 — 재시도하거나 `preview_snapshot`(접근성 트리 텍스트 스냅샷)으로 대체하면 대부분 문제없이 동작함, 실제 앱 문제는 아니었음.
- **HMR(Hot Module Replacement) 반영 지연**: `index.ts` 배럴 파일에 새 export를 추가한 직후 곧바로 페이지를 열면 "Module not found"가 한 번 뜨다가, 재로드하면 사라지는 경우가 있었음(Turbopack의 재컴파일 타이밍 이슈) — 실제 코드 문제가 아니라면 한 번 더 새로고침해서 확인할 것.

## 10. PM(사용자)의 작업 방식

- PRD 스타일의 상세한 "작업지시서"를 스프린트마다 작성해서 전달하는 방식. 구조: 목표 → 기술스택 → 개발원칙 → 개발범위 → Supabase 스키마 → 컴포넌트 목록 → 테스트 → 배포 → 완료조건 → 구현하지 않는 기능(명시적 제외) → 요구하는 보고 형식.
- 큰 스프린트를 ~5개의 독립적으로 검증 가능한 작은 태스크로 쪼개는 것을 선호. 각 태스크 후 build/lint/브라우저 검증 체크포인트.
- **스프린트 종료 시 항상 기대하는 보고 형식**: 1) 구현된 기능 목록 2) 생성/수정된 파일 목록 3) Supabase 변경사항(SQL 포함) 4) Git 커밋 내역 5) Vercel 배포 결과 6) 남은 TODO 7) 다음 스프린트 개선 제안. 재요청 없어도 이 순서대로 전달.
- "고고~" / "진행해줘" / "이어서 진행해줘" = 직전에 제시한 계획대로 진행하라는 승인 표현(새 계획을 요청하는 게 아님).
- 외부 서비스(GitHub/Vercel 대시보드) 관련 막힌 부분은 스크린샷을 붙여넣고 "이 버튼 눌러라" 식의 구체적 가이드를 기대함 — 직접 브라우저를 조작해주길 기대하는 게 아님.
- 애매한 부분이 있으면 최선의 판단(가장 합리적인 옵션)으로 진행하되, 정말 사용자만 결정할 수 있는 지점(라이선스 있는 게임 선택, 스코프 축소/확대, 스키마 설계 방향 등)에서는 먼저 질문(AskUserQuestion 형태로 선택지 제공).

## 11. 남은 작업 / 다음 단계 (한눈에 요약)

**즉시 처리 필요** (둘 다 대시보드에서 — CLI 링크 없음, 2절 참고):
- [x] Supabase 대시보드 → SQL Editor → `0001`~`0009` 마이그레이션 실행 완료
- [x] 프로덕션 `https://game29.vercel.app/` 스모크 테스트 통과 (2026-07-24)

**프로덕션 스모크 테스트** (마이그레이션 후):

| 확인 항목 | 기대 결과 |
|---|---|
| `/games/samegame`, `/games/arkanoid-dx` | 404 없이 게임 로드 |
| 홈 `/` | SameGame, Arkanoid DX 카드 표시 |
| 게임 상세 리더보드 "내 순위" | 랭킹 있으면 "내 순위: #N" 표시; **미랭킹이면 그 줄 자체가 안 보임(정상)** — `leaderboard.tsx`의 `myRank !== null` 조건부 렌더 |
| 홈 Player Rank 카드 | 랭킹 있으면 "#N", 미랭킹이면 **"미랭킹"** 텍스트 표시 — `player-rank-card.tsx` |
| 카테고리 리더보드 | `/categories/puzzle` 등 — 미랭킹이면 "내 순위" 줄 숨김 (`category-leaderboard.tsx`, Leaderboard와 동일 패턴) |

**품질 개선 후보 (당장 급하지 않음)**:
- [ ] Lighthouse 성능 88점 → CLS 원인(홈페이지 카드들의 hydration-gated 렌더링) 해결
- [ ] `createPlayableGame({...})` 통합 래퍼로 게임별 저장 로직 리팩토링 (Sprint 9 PM 리뷰 제안, 아직 미착수)

**예고된 다음 스프린트 (PM 확정 로드맵, 2026-07-24 갱신)**:

| Sprint | Theme | Status |
| --- | --- | --- |
| **Sprint 11** | Operations & SEO | RC1 → GA (`v1.11.0`) |
| **Sprint 12** | Operations Platform 2.0 | RC · Gate HOLD — [`docs/sprint-12-ga-checklist.md`](docs/sprint-12-ga-checklist.md) · GA target `v1.12.0` |
| **Sprint 13** | **Game Quality & Retention** — Pinball·Connect4·Water Sort·Mahjong **출시 패키지** | PLANNED — [`docs/sprint-13-plan.md`](docs/sprint-13-plan.md) · PM ✅ · **구현 HOLD** |
| **Sprint 14** | Friend Compare · Season Competition | PLANNED |
| **Sprint 15** | Community / Challenge | PLANNED |
| **Sprint 16+** | Cloud Save + Login · AI (나중) | BACKLOG |

**PM KPI (매일 6개):** [`docs/pm-kpi-framework.md`](docs/pm-kpi-framework.md)  
**게임 선정 기준:** [`docs/game-selection-criteria.md`](docs/game-selection-criteria.md)

> **로드맵 변경 이력:**
> - Sprint 11 = Cloud Save → **Operations & SEO** (2026-07-24)
> - Sprint 12 = Cloud Save → **Operations Platform**; AI Assistant **동결** (2026-07-24 PM)
> - Sprint 13+ = **게임 품질 → 리텐션 → 운영 데이터** (Epic: Game Package · Retention · Admin KPI 6 · Game Analytics 6 · Quality Gate 10) — PM Review 2026-07-24 2차 ✅
> - Governance v2.0: [`docs/governance-v2-release-gate.md`](docs/governance-v2-release-gate.md)
> - Sprint 13 구현 **금지** until Sprint 12 GA (`v1.12.0`) + operator QA/Rollback PASS

## 12. Cursor로 옮길 때 참고사항

- 이 저장소에는 `apps/web/CLAUDE.md`(`@AGENTS.md`를 import)와 `apps/web/AGENTS.md` 파일이 있습니다. `AGENTS.md`는 "Next.js 16이 당신이 아는 버전과 다르니 `node_modules/next/dist/docs/`를 먼저 읽어라"는 경고와 "Auto Mode Active"(애매하면 질문보다 합리적 판단으로 진행하되, 진짜 막히면 물어봐도 된다) 지침을 담고 있습니다. `AGENTS.md`는 여러 AI 코딩 툴이 공통으로 인식하는 컨벤션 파일명이라 Cursor에서도 프로젝트 규칙으로 인식될 가능성이 높습니다.
- Claude Code 전용 세션 메모리(`~/.claude/projects/.../memory/{MEMORY.md, play29_game_strategy.md, user_pm_workflow.md}`)의 핵심 내용은 이 문서에 전부 옮겨 담았습니다. Cursor는 이 경로에 접근할 수 없으므로, 이 HANDOFF.md가 유일한 인수인계 소스입니다.
- Sprint 10의 상세 설계 문서(Epic별 설계, T0~T12 실행 순서, 검증 기준 원문)를 `docs/sprint-10-plan.md`로 리포 안에 복사해두었습니다 — 이미 전부 구현·커밋되었으므로 참고용입니다.
- 이 문서(HANDOFF.md)와 `docs/sprint-10-plan.md`는 아직 git에 커밋되지 않은 상태입니다(사용자 요청에 따라 커밋/push는 보류) — 로컬 파일로만 존재합니다. Cursor에서 이어서 작업을 시작하기 전에, 필요하다면 커밋해서 버전 관리에 포함시키는 것을 고려하세요.

---

이 문서는 세션 종료 시점의 스냅샷입니다. 앞으로 Cursor에서 코드가 바뀌면 이 문서의 파일 경로/구조 설명이 점점 오래된 정보가 될 수 있으니, 실제 동작을 코드로 재확인하는 것을 우선하세요.
