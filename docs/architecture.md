# Re:Play Architecture

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind 4 |
| Backend | Supabase (Postgres + RPC + RLS) |
| Games | npm workspaces, `@game-platform/game-sdk` |
| Deploy | Vercel (GitHub `main` → auto deploy) |
| Analytics | `analytics_events` + client SDK bridge |

## Monorepo

```
apps/web/           Next.js site + /admin
packages/game-sdk/  Player identity, save, season, missions, analytics hooks
packages/shared/    Game, Category types
packages/ui/        Shared UI
games/*             21 playable game packages
supabase/migrations/ 0001–0017 SQL (manual apply)
```

## Data Model (Core)

| Table | Purpose |
| --- | --- |
| `games`, `categories`, `scores` | Catalog + leaderboard |
| `analytics_events` | Event stream (DAU, funnel, errors) |
| `players`, `sessions`, `game_sessions` | Platform analytics (0011) |
| `cms_*` | Banners, notices, events, featured, visibility |
| `cms_audit_log` | CMS change audit |
| `seo_settings`, `seo_lighthouse_runs` | SEO + verification |

## Engagement (Client)

XP, missions, season, cloud-save **localStorage** via game-sdk (Sprint 12+ cloud sync planned).

## Admin

- Auth: `ADMIN_SECRET` httpOnly cookie
- Service role: `SUPABASE_SECRET_KEY` for RPC reads/writes
- Routes: `/admin`, `/admin/cms`, `/admin/seo`, `/admin/system`

## Public SEO

- `lib/seo/` — metadata, JSON-LD, canonical
- `/sitemap.xml`, `/robots.txt` (disallow `/admin`, `/api`)

## Production URL

`https://game29.vercel.app` (`NEXT_PUBLIC_SITE_URL`)
