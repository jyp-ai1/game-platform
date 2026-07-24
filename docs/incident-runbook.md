# Incident Runbook — Re:Play

## Severity

| Level | Definition | Response |
| --- | --- | --- |
| S1 | Site down / all games broken | Immediate rollback |
| S2 | Admin down / CMS broken | Fix or rollback admin path |
| S3 | Single game / non-critical | Hotfix or CMS visibility hide |
| S4 | Cosmetic / SEO only | Next sprint fix |

## S1 — Site Down

1. Check https://game29.vercel.app and Vercel status
2. Check Supabase dashboard (project `fecwbzyuktkzrbqqxtid`)
3. **Rollback:** Vercel → promote last green deployment ([Rollback Guide](./rollback-guide.md))
4. Notify PM with: time, symptom, rollback commit SHA

## S2 — Admin / CMS Failure

**Symptoms:** `/admin` 500, CMS CRUD errors, migration RPC missing

1. Verify env: `ADMIN_SECRET`, `SUPABASE_SECRET_KEY` on Vercel
2. Supabase SQL: confirm migrations 0013–0017 applied
3. Check browser Network tab for RPC error message
4. Temporary: use Supabase Table Editor for critical content
5. Rollback app only if admin blocker; DB rollback only if schema corrupt

## S3 — Game Not Playable

1. CMS → `/admin/cms/visibility` → set **Maintenance** or **Hidden**
2. Verify `/games/{slug}` shows status block, no GamePlayer
3. Check `isPlayableSlug` in `apps/web/lib/playable-games.ts`

## S4 — SEO / Analytics

1. `/admin/seo` — meta missing counts
2. `/sitemap.xml` — 200 and contains games
3. Analytics: `analytics_events` insert via play session

## Health Checks

| Check | URL / Method |
| --- | --- |
| Home | `GET /` 200 |
| Game | `GET /games/2048` 200 |
| Sitemap | `GET /sitemap.xml` 200 |
| Robots | `GET /robots.txt` disallow /admin |
| Admin auth | `GET /admin` login form |
| Supabase | Dashboard → Database healthy |

## Monitoring (Sprint 11.6+)

- Vercel: deployment notifications
- Supabase: disk, connections
- Admin Dashboard: `errors` KPI from analytics
- CMS Audit Log: `/admin/cms/audit`

## Contacts

| Role | Owner |
| --- | --- |
| PM | GPT + Product owner |
| Dev | Cursor / Senior Developer |
| DevOps | Vercel + Supabase manual ops |

## Post-Incident

1. Root cause in `docs/reports/` or issue tracker
2. Update QA test plan if gap found
3. Rollback drill if rollback failed
