# Release Checklist — Sprint 11 (v1.11.0)

## Pre-Release (Developer)

- [ ] `npm run typecheck` PASS
- [ ] `npm run lint` PASS (0 errors)
- [ ] `npm run build` PASS
- [ ] All migrations applied on Supabase (0010–0017)
- [ ] `HANDOFF.md` / docs updated

## QA Gate

- [ ] `docs/qa-test-plan.md` executed
- [ ] Senior QA Report: `docs/reports/sprint-11/qa-report.md` → PASS
- [ ] Mobile 768px+ verified
- [ ] Chrome / Edge smoke test
- [ ] No console errors on home + game + admin login

## DevOps Gate

- [ ] `git push origin main` success
- [ ] Vercel deployment green
- [ ] Production URL responds 200
- [ ] Rollback tag exists: `v1.10.5-rollback` or prior release tag
- [ ] Rollback SQL documented in `docs/rollback-guide.md`
- [ ] Senior DevOps Report → PASS

## AI Engineer

- [ ] N/A (no AI features in Sprint 11)

## PM Release

- [ ] Product goal: Operations platform (Dashboard + CMS + SEO foundation)
- [ ] UX: Admin navigable without code changes
- [ ] Operation: Audit log, SEO dashboard, verification tokens
- [ ] Monitoring: `/admin/system`, analytics events
- [ ] KPI: DAU/WAU/MAU, Stickiness, Resume rate visible
- [ ] Risk assessment documented
- [ ] PM Release Report → PASS

## Release Artifacts

- [ ] `RELEASE_NOTES_v1.11.0.md`
- [ ] Git tag: `v1.11.0`
- [ ] Rollback tag: document previous commit SHA

## Post-Release (15 min)

- [ ] Home, `/games/2048`, `/admin/cms`, `/admin/seo` smoke test
- [ ] Sitemap accessible
- [ ] Rollback drill (optional): revert commit on preview branch
