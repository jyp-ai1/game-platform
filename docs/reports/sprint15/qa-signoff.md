# Sprint 15 Epic 2 — RC1 Master QA Plan

**Updated:** 2026-07-24 (Sessions 4–8 — Staging QA complete · Preview NO GO)  
**Branch:** `content-factory` @ `4cc1d0c`  
**Preview:** https://game29-git-content-factory-jyp-ai1s-projects.vercel.app  
**Developer:** **HOLD**  
**Senior QA:** Sessions 4–8 **COMPLETE (staging)** · Official sign-off **NO GO**

---

### Developer Assessment

No code defects identified. Developer remains **HOLD** pending Preview QA findings only.

---

## PM Product QA Progress

| Area | Progress | Status |
|------|----------|--------|
| Developer / Code Quality | 100% | ✅ PASS |
| QA Documentation & Templates | **100%** | ✅ PASS |
| Staging QA (localhost) | **~85%** | ✅ Sessions 4–6 |
| Preview Product QA | 0% | ❌ OB-001 |
| Release | 0% | ❌ NO GO |

**Verdict:** Staging certification complete. **Official RC1 blocked by OB-001.**

---

## QA Asset Index

| Asset | File | Session |
|-------|------|---------|
| **RC1 Release Summary** | [`rc1-release-summary.md`](./rc1-release-summary.md) | 8 |
| Environment A-1~A-6 | [`rc1-environment-audit.md`](./rc1-environment-audit.md) | 4 |
| Route audit A-3 | [`rc1-route-audit.md`](./rc1-route-audit.md) | 4 |
| Regression (Sprint 1–15) | [`rc1-regression-matrix.md`](./rc1-regression-matrix.md) | 6 |
| 50-game matrix | [`rc1-game-qa-matrix.md`](./rc1-game-qa-matrix.md) | 5 |
| Accessibility | [`rc1-a11y-checklist.md`](./rc1-a11y-checklist.md) | 7 |
| Responsive | [`rc1-responsive-checklist.md`](./rc1-responsive-checklist.md) | 7 |
| Lighthouse | [`rc1-lighthouse-template.md`](./rc1-lighthouse-template.md) | 7 |
| Document audit | [`rc1-document-audit.md`](./rc1-document-audit.md) | 8 |
| Release package | [`release-notes-rc1.md`](./release-notes-rc1.md), [`known-issues.md`](./known-issues.md), [`deployment-log.md`](./deployment-log.md), [`release-checklist.md`](./release-checklist.md) | 8 |
| Sprint 16 kickoff | [`../sprint16/sprint16-kickoff.md`](../sprint16/sprint16-kickoff.md) | 8 |
| Bugs | [`bug-list.md`](./bug-list.md) | |

---

## PM Gate matrix

| Gate | Status | Owner |
|------|--------|-------|
| Developer | **PASS** | ✓ |
| Senior Developer | **PASS** | ✓ |
| Code Quality | **PASS** | ✓ |
| Senior QA (staging) | **PASS** | Sessions 4–6 localhost |
| Senior QA (official) | **NO GO** | OB-001 · Preview pending |
| DevOps | **WAIT** | After Preview QA GO |
| PM Release | **HOLD** | PM |
| main / Production | **⛔ FORBIDDEN** | PM |

---

## Execution Log

| Date | Session | Action | Result |
|------|---------|--------|--------|
| 2026-07-24 | 1 | Preview access | FAIL — SSO |
| 2026-07-24 | 1 | Docs + OB-001 | `242d416` |
| 2026-07-24 | 2 | Master Plan A–I | `c08578b` |
| 2026-07-24 | 2 | Local route smoke 50/50 | prep PASS |
| 2026-07-24 | 3 | QA prep assets | `4cc1d0c` |
| 2026-07-24 | **4** | A-1 Preview access | **FAIL** — SSO → vercel.com/login |
| 2026-07-24 | **4** | A-2 Environment (staging) | PASS — robots/sitemap/canonical |
| 2026-07-24 | **4** | A-3 Smoke 16 routes + 50 games | **PASS** localhost |
| 2026-07-24 | **4** | Build / Lint / Typecheck | **PASS** |
| 2026-07-24 | **5** | Functional QA matrix | Open 50/50 · 5 priority STAGING PASS |
| 2026-07-24 | **6** | Regression 52 items | STAGING PASS (18 PASS + 34 STAGING) |
| 2026-07-24 | **7** | Responsive / A11y / Lighthouse | **Preview PENDING** (OB-001) |
| 2026-07-24 | **8** | RC audit + release summary | **NO GO** recommendation |
| 2026-07-24 | **8** | Release package (draft) + Sprint 16 kickoff | Prepared |

**Next:** Operator OP-1 → Preview QA re-run → DevOps → PM GO

---

## Phase Status

| Phase | Name | Staging | Preview |
|-------|------|:-------:|:-------:|
| A | Environment + Smoke | **PASS** | **FAIL** (A-1) |
| B | Functional (platform) | partial | pending |
| C | Game QA (50) | Open 50/50 | pending |
| D | Regression (S1–15) | STAGING | pending |
| E | Responsive | pending | pending |
| F | Accessibility | pending | pending |
| G | Performance / Lighthouse | pending | pending |
| H | Document audit | **100%** | release docs draft |
| I | DevOps + PM Review | **WAIT** | HOLD |

---

## Operational Blocker

| ID | Issue | Owner | Developer Action |
|----|-------|-------|------------------|
| OB-001 | Preview Deployment Protection (SSO) | Operator | **None** |

---

## Release approval

- [ ] Preview Access PASS
- [x] Build / Lint / Typecheck PASS
- [ ] Functional QA (50/50 interactive on Preview)
- [ ] Regression QA official PASS on Preview
- [ ] Responsive QA (6 viewports)
- [ ] Accessibility QA (Lighthouse 100)
- [ ] Lighthouse QA (Perf ≥90)
- [ ] DevOps QA
- [x] P0 code = 0 · P1 code = 0
- [ ] OB-001 closed

**Recommendation:** [`rc1-release-summary.md`](./rc1-release-summary.md) → **NO GO**

---

## PM rules

**Allowed:** QA on Preview, P0/P1 hotfixes from QA, release doc updates  
**Forbidden:** new features, refactoring, main merge, Production promote

**Developer:** HOLD until Preview QA finds P0/P1.
