# RC1 Release Checklist

**Updated:** 2026-07-24 (Session 8)  
**Recommendation:** **NO GO** — see [`rc1-release-summary.md`](./rc1-release-summary.md)

---

## Code Quality

- [x] Build PASS
- [x] Typecheck PASS
- [x] Lint PASS
- [x] Code P0 = 0
- [x] Code P1 = 0 (pre-Preview QA)
- [x] Developer HOLD (no unauthorized changes)

---

## Product QA

- [ ] Preview Access PASS (OB-001 closed)
- [ ] Environment verify on Preview (`NEXT_PUBLIC_SITE_URL`, robots, sitemap, canonical)
- [ ] Smoke all routes on Preview
- [ ] Functional QA 50/50 (interactive browser)
- [ ] Regression 52/52 PASS on Preview
- [ ] Responsive 6 viewports × 7 pages
- [ ] Accessibility keyboard + ARIA + Lighthouse A11y 100
- [ ] Lighthouse Perf ≥90, BP 100, SEO 100

**Staging prep complete:**

- [x] Localhost route smoke 16 + 50 games
- [x] Matrices filled (staging column)
- [x] Document audit Session 8

---

## DevOps (after QA GO)

- [ ] Git clean / QA docs committed
- [ ] Push `content-factory`
- [ ] Preview deploy verified
- [ ] Production health check
- [ ] Rollback point recorded
- [ ] RC tag created
- [ ] `deployment-log.md` finalized

---

## Release Package (after PM GO)

- [x] `rc1-release-summary.md` (NO GO draft)
- [x] `release-notes-rc1.md` (DRAFT)
- [x] `known-issues.md`
- [x] `deployment-log.md` (DRAFT)
- [x] `release-checklist.md` (this file)
- [ ] CHANGELOG entry (on GO)
- [ ] PM final sign-off

---

## Forbidden (PM rules)

- [ ] ~~New features~~
- [ ] ~~New games~~
- [ ] ~~Refactoring~~
- [ ] ~~Architecture / DB changes~~
- [ ] ~~Merge to `main` / Production promote~~
