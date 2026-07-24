# RC1 Environment Audit — Phase A-4 ~ A-6

**Session:** 3 (2026-07-24)  
**Environment:** localhost:3010 (prep) · Preview pending OB-001  
**Code changes:** None

---

## A-4 Sitemap Audit

| Check | Localhost | Preview | Notes |
|-------|-----------|---------|-------|
| `/sitemap.xml` returns 200 | **PASS** | pending | |
| XML well-formed | **PASS** | pending | |
| Static routes included | **PASS** | pending | `/`, `/games`, `/about`, `/privacy`, `/terms`, `/contact` |
| Game routes (ACTIVE/COMING_SOON) | **PASS** | pending | ~50+ game URLs in sitemap |
| Category routes | **PASS** | pending | From CMS categories |
| `lastModified` on games | **PASS** | pending | `safeLastModified()` in `sitemap.ts` |
| Fallback without Supabase env | **PASS** | pending | Returns static routes only |

**Observation (verify on Preview):** Sitemap `<loc>` uses `siteUrl` from env. Local dev shows `http://localhost:3000` — confirm `NEXT_PUBLIC_SITE_URL` on Preview/Production.

**Not in sitemap (by design?):** `/profile`, `/favorites`, `/search` — user/session pages; confirm with PM if intentional.

---

## A-5 robots.txt Audit

| Check | Localhost | Preview |
|-------|-----------|---------|
| `/robots.txt` 200 | **PASS** | pending |
| `Allow: /` | **PASS** | pending |
| `Disallow: /admin` | **PASS** | pending |
| `Disallow: /api` | **PASS** | pending |
| Sitemap reference | **PASS** | pending | Points to `{siteUrl}/sitemap.xml` |

Source: `apps/web/app/robots.ts`

---

## A-6 Metadata Audit (code review)

| Page | canonical | og:image | JSON-LD | Source |
|------|:---------:|:--------:|:-------:|--------|
| Home | ✓ | `/opengraph-image` | Organization + WebSite | `buildHomeMetadata`, `layout.tsx` |
| Game detail | ✓ per slug | `/games/[slug]/opengraph-image` | Game + SoftwareApplication + Breadcrumb | `buildGameMetadata`, `games/[slug]/page.tsx` |
| Category | ✓ | shared OG | Category + Breadcrumb | `categories/[slug]/page.tsx` |
| Games list | ✓ | partial | — | `buildGamesListMetadata` |
| Root layout | metadataBase | twitter card | SearchAction in WebSite | `layout.tsx` |
| Admin | robots disallow | — | — | Not indexed |

**lang:** `ko` on `<html>` ✓  
**Verification tags:** Google/Bing/Naver from CMS settings ✓

Preview browser verification: **pending** (OB-001)

---

## A-2 Local Build (prep)

| Check | Result |
|-------|--------|
| `npm run typecheck` | **PASS** (Epic 1-D) |
| `npm run lint` | **PASS** (Epic 1-D) |
| `npm run build` | **PASS** (Epic 1-D) |
| Dev server | **PASS** (localhost:3010) |

---

## A-1 Preview Access (Session 4)

| Check | Result | Notes |
|-------|--------|-------|
| Preview URL | **FAIL** | OB-001 |
| HTTP | Redirect | → `vercel.com/login?next=/sso-api...` |
| SSO | **FAIL** | Deployment Protection |
| Cache | pending | Preview unreachable |
| Build ID | pending | Preview unreachable |

**Staging smoke (Session 4 A-3):** 16 public routes + 50 game pages **HTTP 200** on localhost:3010

**Phase A official gate:** Staging **PASS** · Preview **FAIL** (OB-001)
