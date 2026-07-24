# RC1 Route Audit — Phase A-5

**Session:** 3 (2026-07-24)  
**Legend:** HTTP = localhost prep · Browser/Console = Preview pending

---

## Public routes

| Route | HTTP | Metadata | Redirect | Notes |
|-------|:----:|:--------:|:--------:|-------|
| `/` | 200 | code ✓ | — | Home |
| `/games` | 200 | code ✓ | — | Game list |
| `/games/[slug]` (×50) | 200×50 | code ✓ | — | All playable slugs |
| `/profile` | 200 | partial | — | Player Hub |
| `/favorites` | 200 | partial | — | |
| `/search` | 200 | partial | — | |
| `/about` | 200 | partial | — | |
| `/contact` | 200 | partial | — | |
| `/privacy` | 200 | partial | — | |
| `/terms` | 200 | partial | — | |
| `/categories/[slug]` | 200 | code ✓ | — | e.g. `/categories/puzzle` |
| `/leaderboard` | **N/A** | — | — | Embedded in `/games/[slug]` |
| `/sitemap.xml` | 200 | — | — | |
| `/robots.txt` | 200 | — | — | |
| `/manifest.webmanifest` | 200 | — | — | |
| `/opengraph-image` | pending | — | — | Verify on Preview |
| `/games/[slug]/opengraph-image` | pending | — | — | Dynamic OG |

## Admin routes (not in Product QA SEO scope)

| Route | Expected |
|-------|----------|
| `/admin` | 200 (auth required) |
| `/admin/cms/*` | auth |
| `/admin/analytics` | auth |
| `/api/admin/auth` | API |

## Error routes (Preview QA)

| Case | Expected | Tested |
|------|----------|--------|
| Unknown slug `/games/not-a-game` | 404 | pending |
| `/admin` without auth | login form | pending |
| Network 500 | 0 | pending |

## Console / Hydration (Preview)

| Page | Console Error | Hydration | Network 500 |
|------|:-------------:|:---------:|:-------------:|
| `/` | pending | pending | pending |
| `/games/2048` | pending | pending | pending |
| `/profile` | pending | pending | pending |

**Route scan prep:** **PASS** (HTTP 200 on all public routes + 50 games)  
**Official sign-off:** pending Preview browser audit
