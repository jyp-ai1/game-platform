# QA Test Plan — Sprint 11 (v1.11.0)

> **Environment:** Production `https://game29.vercel.app`  
> **Executor:** Senior QA (Independent)  
> **Actual / Result:** QA 실행 시 기록

## Legend

| Result | Meaning |
| --- | --- |
| PASS | Expected = Actual |
| FAIL | Bug — log in Known Issues |
| SKIP | Blocked by env / N/A |
| HOLD | Not yet executed |

---

## HOME (HOME-001 – HOME-010)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| HOME-001 | Load `/` | 200, Hero visible | | HOLD |
| HOME-002 | CMS notice bar | Shows when active notice in DB | | HOLD |
| HOME-003 | CMS banner strip | Shows when active banner | | HOLD |
| HOME-004 | Featured order | Notice → Banner → Featured slots → Categories | | HOLD |
| HOME-005 | Featured fallback | Empty CMS featured → algorithm popular/new | | HOLD |
| HOME-006 | Category links | All 5 categories link works | | HOLD |
| HOME-007 | Recently played | Section renders (localStorage) | | HOLD |
| HOME-008 | Season card | Renders Lv/XP | | HOLD |
| HOME-009 | Revalidate | CMS change reflects within 60s | | HOLD |
| HOME-010 | Meta title | Contains "무료 온라인 게임" | | HOLD |

## GAMES (GAME-001 – GAME-020)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| GAME-001 | `/games/2048` ACTIVE | GamePlayer loads | | HOLD |
| GAME-002 | `/games/brick-puzzle` COMING_SOON | Status block, no player | | HOLD |
| GAME-003 | Maintenance via CMS | Point inspection block, no play | | HOLD |
| GAME-004 | Hidden game URL | 404 | | HOLD |
| GAME-005 | Leaderboard | Loads top scores | | HOLD |
| GAME-006 | My rank hidden when unranked | No "내 순위" row | | HOLD |
| GAME-007 | Score submit | RPC success | | HOLD |
| GAME-008 | Play count increment | play_count +1 on visit | | HOLD |
| GAME-009 | OG image | `/games/2048/opengraph-image` 200 | | HOLD |
| GAME-010 | JSON-LD | VideoGame + SoftwareApplication in page | | HOLD |
| GAME-011 | Canonical | link rel=canonical to game URL | | HOLD |
| GAME-012 | Related games | Section shows same category | | HOLD |
| GAME-013 | Favorite toggle | Persists localStorage | | HOLD |
| GAME-014 | `/games` list | All visible games listed | | HOLD |
| GAME-015 | Category `/categories/puzzle` | Filtered games | | HOLD |
| GAME-016 | Search | `/search?q=2048` finds game | | HOLD |
| GAME-017 | 21 playable slugs | Each ACTIVE game loads player | | HOLD |
| GAME-018 | Game end analytics | game_end event (network) | | HOLD |
| GAME-019 | Save created event | save_created on save | | HOLD |
| GAME-020 | Resume event | save_resumed on continue | | HOLD |

## CMS (CMS-001 – CMS-030)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| CMS-001 | Banner create | Row in cms_banners | | HOLD |
| CMS-002 | Banner delete | Row removed | | HOLD |
| CMS-003 | Banner ON/OFF | is_active toggles home visibility | | HOLD |
| CMS-004 | Banner schedule start | Hidden before starts_at | | HOLD |
| CMS-005 | Banner schedule end | Hidden after ends_at | | HOLD |
| CMS-006 | Banner sort_order | Order on home strip | | HOLD |
| CMS-007 | Notice urgent | Type badge on home | | HOLD |
| CMS-008 | Notice maintenance | Type badge | | HOLD |
| CMS-009 | Notice update | Type badge | | HOLD |
| CMS-010 | Notice event | Type badge | | HOLD |
| CMS-011 | Notice delete | Removed from list | | HOLD |
| CMS-012 | Event create | Row with dates + game_slug | | HOLD |
| CMS-013 | Event reward text | Stored | | HOLD |
| CMS-014 | Featured weekly_pick | Home section updates | | HOLD |
| CMS-015 | Featured editors_pick | Home section updates | | HOLD |
| CMS-016 | Featured trending | Home section updates | | HOLD |
| CMS-017 | Featured popular | Home section updates | | HOLD |
| CMS-018 | Featured new_games | Home section updates | | HOLD |
| CMS-019 | Featured delete | Removed from slot | | HOLD |
| CMS-020 | Category sort_order | Order changes on site | | HOLD |
| CMS-021 | Visibility → Visible | games.status ACTIVE | | HOLD |
| CMS-022 | Visibility → Hidden | 404 on game page | | HOLD |
| CMS-023 | Visibility → Coming Soon | Status block | | HOLD |
| CMS-024 | Visibility → Maintenance | Maintenance block | | HOLD |
| CMS-025 | Audit log entry | Row on CMS change | | HOLD |
| CMS-026 | Audit IP (0017) | actor_ip populated | | HOLD |
| CMS-027 | Audit User-Agent | user_agent populated | | HOLD |
| CMS-028 | Audit before/after | JSON states on update | | HOLD |
| CMS-029 | Overview KPIs | Counts on /admin/cms | | HOLD |
| CMS-030 | Unauthorized CMS | Redirect/login without cookie | | HOLD |

## ADMIN DASHBOARD (DASH-001 – DASH-015)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| DASH-001 | Login | ADMIN_SECRET works | | HOLD |
| DASH-002 | DAU/WAU/MAU | Numbers render | | HOLD |
| DASH-003 | Period tabs | today/week/month/all | | HOLD |
| DASH-004 | Funnel chart | 6 steps | | HOLD |
| DASH-005 | Cohort grid | D1/D7/D30 | | HOLD |
| DASH-006 | Heatmap | 30-day grid | | HOLD |
| DASH-007 | TOP10 games | Bar chart | | HOLD |
| DASH-008 | Stickiness | DAU/MAU % (0016) | | HOLD |
| DASH-009 | Resume rate | save/resume % | | HOLD |
| DASH-010 | Avg play time | Seconds from game_end | | HOLD |
| DASH-011 | Live plays | Recent session list | | HOLD |
| DASH-012 | Growth table | 14-day DAU | | HOLD |
| DASH-013 | Nav CMS link | /admin/cms | | HOLD |
| DASH-014 | Nav SEO link | /admin/seo | | HOLD |
| DASH-015 | robots noindex admin | admin not indexed | | HOLD |

## SEO (SEO-001 – SEO-015)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| SEO-001 | sitemap.xml | /, /games/*, /categories/* | | HOLD |
| SEO-002 | robots.txt | disallow /admin, /api | | HOLD |
| SEO-003 | Home metadata | title, description, OG | | HOLD |
| SEO-004 | Game metadata | absolute title format | | HOLD |
| SEO-005 | Category metadata | "게임 모음" title | | HOLD |
| SEO-006 | JSON-LD Organization | On all pages via layout | | HOLD |
| SEO-007 | JSON-LD Breadcrumb | Game + category pages | | HOLD |
| SEO-008 | SEO dashboard | Stats after 0015 | | HOLD |
| SEO-009 | Google verification save | Meta in head | | HOLD |
| SEO-010 | Bing verification save | msvalidate meta | | HOLD |
| SEO-011 | Naver verification save | naver-site-verification | | HOLD |
| SEO-012 | URL inspect /games/2048 | Indexable + no issues | | HOLD |
| SEO-013 | Hidden game sitemap | Not in sitemap | | HOLD |
| SEO-014 | manifest.webmanifest | 200 | | HOLD |
| SEO-015 | lang=ko | html lang attribute | | HOLD |

## ANALYTICS (AN-001 – AN-010)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| AN-001 | session_start | Event on load | | HOLD |
| AN-002 | game_start | On game mount | | HOLD |
| AN-003 | game_end | On game over | | HOLD |
| AN-004 | score_submit | On leaderboard | | HOLD |
| AN-005 | favorite | On toggle | | HOLD |
| AN-006 | profile_open | Profile page | | HOLD |
| AN-007 | achievement | Unlock flow | | HOLD |
| AN-008 | daily_reward | Claim | | HOLD |
| AN-009 | RPC track_analytics_event | No 4xx/5xx | | HOLD |
| AN-010 | device_id persisted | Same across sessions | | HOLD |

## PLAYER (PLR-001 – PLR-015)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| PLR-001 | Profile page | Stats render | | HOLD |
| PLR-002 | XP display | Header badge | | HOLD |
| PLR-003 | Missions weekly | Card on home | | HOLD |
| PLR-004 | Daily challenge | Card on home | | HOLD |
| PLR-005 | Favorites page | localStorage games | | HOLD |
| PLR-006 | Continue playing | Save resume card | | HOLD |
| PLR-007 | Player rank card | 미랭킹 when unranked | | HOLD |
| PLR-008 | Nickname | Editable | | HOLD |
| PLR-009 | Best score local | Per game | | HOLD |
| PLR-010 | Season XP | Progress bar | | HOLD |
| PLR-011 | Achievements grid | Unlock states | | HOLD |
| PLR-012 | Toast notifications | Achievement toast | | HOLD |
| PLR-013 | Sound toggle | Persists | | HOLD |
| PLR-014 | Mobile nav | Hamburger works | | HOLD |
| PLR-015 | Recently played | Max items cap | | HOLD |

## REGRESSION (REG-001 – REG-010)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| REG-001 | Tetris playable | Full game loop | | HOLD |
| REG-002 | Snake playable | Full game loop | | HOLD |
| REG-003 | Breakout playable | Full game loop | | HOLD |
| REG-004 | Privacy page | Static 200 | | HOLD |
| REG-005 | Terms page | Static 200 | | HOLD |
| REG-006 | 404 page | Custom not-found | | HOLD |
| REG-007 | Footer links | All work | | HOLD |
| REG-008 | Dark theme | Default dark | | HOLD |
| REG-009 | No hydration error | Console clean on home | | HOLD |
| REG-010 | No network 500 | Home + game | | HOLD |

## MOBILE / RESPONSIVE (MOB-001 – MOB-005)

| Case ID | Scenario | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| MOB-001 | 768px home | Layout intact | | HOLD |
| MOB-002 | 768px game | Player usable | | HOLD |
| MOB-003 | 768px admin | Sidebar/nav usable | | HOLD |
| MOB-004 | 390px home | No horizontal scroll | | HOLD |
| MOB-005 | Touch play link | Game starts | | HOLD |

## BROWSER (BR-001 – BR-005)

| Case ID | Browser | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| BR-001 | Chrome latest | Full smoke PASS | | HOLD |
| BR-002 | Edge latest | Full smoke PASS | | HOLD |
| BR-003 | Safari (if avail) | Home + game | | HOLD |
| BR-004 | Firefox latest | Home + game | | HOLD |
| BR-005 | Console errors | Zero on smoke paths | | HOLD |

## PERFORMANCE (PERF-001 – PERF-005)

| Case ID | Metric | Target | Actual | Result |
| --- | --- | --- | --- | --- |
| PERF-001 | Lighthouse Performance | ≥95 | | HOLD |
| PERF-002 | Lighthouse SEO | 100 | | HOLD |
| PERF-003 | Lighthouse Accessibility | 100 | | HOLD |
| PERF-004 | CLS | ≤0.05 | | HOLD |
| PERF-005 | LCP | ≤2.5s | | HOLD |

---

## Summary

| Area | Cases | PASS | FAIL | HOLD |
| --- | ---: | ---: | ---: | ---: |
| Total | **130** | 0 | 0 | 130 |

**QA Gate:** PASS requires 0 FAIL on P0 (CMS, Admin auth, ACTIVE games, SEO sitemap/robots) and PERF targets documented or waived by PM.
