# Release Notes — v1.11.0 (Sprint 11 — Operations Platform)

**Status:** DRAFT — PM Release **HOLD** until Gate PASS  
**Production:** https://game29.vercel.app  
**Date:** 2026-07-24

## Highlights

Sprint 11 transforms Re:Play from a game collection into an **operations-ready platform**:

- **Executive Dashboard** — DAU/WAU/MAU, funnel, cohort, heatmap, extended KPIs (stickiness, resume rate)
- **CMS** — Banners, notices, events, featured games, category order, game visibility (incl. Maintenance)
- **SEO Foundation** — Dynamic metadata, JSON-LD, sitemap, robots, admin SEO dashboard, Search Console verification
- **Governance v2.0** — QA test plan (130 cases), rollback guide, incident runbook

## Features

### Admin & Analytics
- `/admin` executive dashboard with period tabs
- Analytics SDK (~20 event types)
- Platform tables: players, sessions, game_sessions

### CMS (`/admin/cms`)
- Banner / Notice / Event / Featured / Category / Visibility CRUD
- Audit log (enhanced with IP, User-Agent, before/after in 0017)
- Home integration: notices, banners, featured slots

### SEO (`/admin/seo`)
- Per-game and category metadata + canonical
- Organization / WebSite / Game / Breadcrumb JSON-LD
- Verification tokens (Google, Bing, Naver)
- URL inspector

### Game Platform
- Maintenance / Hidden / Coming Soon status blocks
- 21 playable games unchanged

## Database Migrations

Apply in order: `0010` → `0017` (see `docs/deployment.md`)

## Breaking Changes

None for players. Admin requires `ADMIN_SECRET` + `SUPABASE_SECRET_KEY`.

## Known Issues

- CMS: no drag-and-drop sort or image upload yet (Sprint 11.7+)
- PWA offline/install not shipped (T8)
- Full QA 130-case execution pending (HOLD)

## Rollback

See `docs/rollback-guide.md`. Target rollback tag: `v1.10.5`.

## Contributors

PM (GPT) · Senior Developer (Cursor) · QA/DevOps (Independent review pending)
