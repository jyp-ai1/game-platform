# Deployment Guide

## Prerequisites

- GitHub: `jyp-ai1/game-platform`
- Vercel project: `game29`
- Supabase: `fecwbzyuktkzrbqqxtid`

## Environment Variables (Vercel)

| Variable | Scope | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Yes |
| `SUPABASE_SECRET_KEY` | Production | Yes (admin) |
| `ADMIN_SECRET` | Production | Yes |
| `NEXT_PUBLIC_SITE_URL` | Production | Yes (`https://game29.vercel.app`) |

## Deploy Flow

```bash
# Local verification (required before push)
npm run typecheck
npm run lint
npm run build

# Push triggers Vercel
git push origin main
```

## Database Migrations

Migrations are **not** auto-applied. Run in Supabase SQL Editor **in order**:

```
0010 → 0011 → 0012 → 0013 → 0014 → 0015 → 0016 → 0017
```

See [Rollback Guide](./rollback-guide.md) for reverse order.

## Post-Deploy Verification

1. https://game29.vercel.app — home loads
2. https://game29.vercel.app/admin — login works
3. https://game29.vercel.app/sitemap.xml
4. `/admin/seo` — audit stats (after 0015)
5. `/admin` — KPIs (after 0013/0016)

## Build Time Reference

~90s production build (Next.js 16 Turbopack, 17 workers).
