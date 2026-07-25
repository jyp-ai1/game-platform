====================================

Sprint16 — Re:Play Identity Pivot
Epic3~Epic7 완료율

████████░░  85%

Before / After

| 화면 | Before | After |
|------|--------|-------|
| Home | `docs/reports/sprint16/screenshots/epic2-5/before-home-desktop.png` | `docs/reports/sprint16/screenshots/epic3-7/home-desktop-1280.png` |
| Home (mobile) | `docs/reports/sprint16/screenshots/epic2-5/after-home-mobile.png` | `docs/reports/sprint16/screenshots/epic3-7/home-mobile-375.png` |
| Game Detail | — | `docs/reports/sprint16/screenshots/epic3-7/game-detail-1280.png` |
| Community | `docs/reports/sprint16/screenshots/epic1/after-community.png` | `docs/reports/sprint16/screenshots/epic3-7/community-1280.png` |
| Profile | `docs/reports/sprint16/screenshots/epic2-5/after-profile-desktop.png` | `docs/reports/sprint16/screenshots/epic3-7/profile-1280.png` |
| Admin Health | — | `docs/reports/sprint16/screenshots/epic3-7/admin-health-1280.png` |

서비스 변화

1. Home이 “게임 리스트”에서 **Play-first 비주얼 허브**로 바뀌었습니다 — Continue · Daily Challenge · Top3 · Rule 추천이 한 화면에 모입니다.
2. Game Detail이 **플레이 → 기록 → 다음 게임** 흐름으로 재구성되어, 한 판 끝나면 바로 이어서 플레이할 수 있습니다.
3. Profile · Community · Operator Health에 **Replay Score · Bug Report · RC 게이트**가 추가되어 “게임 생활 플랫폼” 정체성이 완성됩니다.

Preview URL

https://game29-git-content-factory-jyp-ai1s-projects.vercel.app

Deployment URL

https://game29-git-content-factory-jyp-ai1s-projects.vercel.app

Commit

3ea1c9a (Epic3~7: 161768c → e7ed833 → 4c0903b → c518002 → 3ea1c9a)

QA 결과

| Check | Result |
|-------|--------|
| typecheck | PASS |
| build | PASS |
| qa:quality | PASS (50/50 games, metadata, thumbnails) |
| regression (static) | PASS |
| regression (e2e 50-game) | FAIL — stale port 3020 / Windows grep pipe (fixed in 3ea1c9a) |
| sprint16 e2e | PARTIAL — needs fresh server (CI=1 + QA_PORT) |

RC Score

91%

Known Issues

- Community Comments/Reviews/Share 카드는 Sprint17 소셜 피드 연동 전 placeholder 링크
- 50-game Playwright smoke는 로컬 stale server(3020) 재사용 시 실패 — `CI=1 QA_PORT=3025` 권장
- Preview 배포는 push 후 Vercel 빌드 완료까지 2~5분 지연

내일 추천 작업

1. Sprint17 — Community 실댓글 · 별점 · Daily Challenge 랭킹 API
2. Game Detail “플레이 종료 → 자동 다음 게임” 모달
3. Home Hero A/B — floating card 게임을 최근 플레이 기반으로 동적 교체

====================================
