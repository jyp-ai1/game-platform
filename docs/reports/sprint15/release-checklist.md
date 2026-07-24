# RC1 Release Checklist

**Updated:** 2026-07-25  
**Recommendation:** **GO (Developer RC1 Candidate)** — [`rc1-release-summary.md`](./rc1-release-summary.md)

---

## Code Quality

- [x] Build PASS
- [x] Typecheck PASS
- [x] Lint PASS
- [x] Code P0 = 0
- [x] Code P1 = 0
- [x] Developer HOLD (hotfix only)

---

## Product QA

- [x] Staging smoke 16 routes + 50 games
- [x] Functional QA (dev cert + staging open 50/50)
- [x] Regression 52/52 (staging)
- [x] Release Package 50/50
- [x] Analytics code matrix 50/50
- [ ] Preview Access (OB-001) — **waived**, Operator fast-follow
- [ ] Lighthouse on Preview/Prod — deferred

---

## DevOps

- [x] Git committed + pushed (`content-factory`)
- [x] Preview deploy triggered
- [x] Rollback point recorded
- [x] Tag `rc1-candidate` created
- [x] `deployment-log.md` finalized
- [ ] Production health check — **after PM main merge**

---

## Release Package

- [x] `rc1-release-summary.md` — GO
- [x] `release-notes-rc1.md`
- [x] `known-issues.md`
- [x] `deployment-log.md`
- [x] `operator-matrix.md`
- [x] `developer-rc1-package.md`
- [x] CHANGELOG RC1 section
- [ ] PM Production sign-off

---

## Forbidden

- [x] No main merge (held)
- [x] No Production promote (held)
- [x] No new features / games / refactor
