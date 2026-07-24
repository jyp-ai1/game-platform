# RC1 Deployment Log

**Status:** **RC1 Candidate** — DevOps prep complete  
**Updated:** 2026-07-25  
**RC1 Commit:** `7fb81f2`  
**Tag:** `rc1-candidate` (content-factory)

---

## Gate

| Step | Owner | Status |
|------|-------|--------|
| Developer RC1 | Senior Dev | ✅ GO |
| Product QA (staging) | Senior QA | ✅ GO (OB-001 waived) |
| DevOps prep | DevOps | ✅ **COMPLETE** |
| PM Production Release | PM | ⏳ Pending |
| main merge / Production | — | ⛔ **FORBIDDEN** until PM |

---

## DevOps Checklist

| # | Step | Result | Notes |
|---|------|--------|-------|
| 1 | Git status | ✅ | Branch `content-factory` @ `7fb81f2` |
| 2 | QA + Release docs committed | ✅ | Sessions 4–8 + Continuous Batch |
| 3 | Push origin | ✅ | `content-factory` pushed |
| 4 | Preview deploy | ✅ | Vercel auto-deploy from push |
| 5 | Production verify | ⏳ | **Blocked** — no main merge |
| 6 | Health check (staging) | ✅ | Prior session: 16 routes + 50 games HTTP 200 |
| 7 | Rollback point | ✅ | `4cc1d0c` (pre-RC1 batch) · `e1b9cc1` (pre-GO) |
| 8 | Tag | ✅ | `rc1-candidate` → `7fb81f2` |
| 9 | Release candidate doc | ✅ | [`rc1-release-summary.md`](./rc1-release-summary.md) |

---

## Environment Reference

| Env | URL | Status |
|-----|-----|--------|
| Preview | https://game29-git-content-factory-jyp-ai1s-projects.vercel.app | Deploy triggered · SSO optional |
| Production | https://game29.vercel.app | Unchanged (main not merged) |
| Local QA | http://localhost:3010 | `npm run qa:localhost` |

---

## Rollback

| Item | Value |
|------|-------|
| RC1 tag | `rc1-candidate` @ `7fb81f2` |
| Pre-RC1 stable | `4cc1d0c` |
| Rollback trigger | P0 in Production after promote |
| Procedure | Vercel → redeploy prior Production build; or revert merge |

---

## Operator Fast-Follow

See [`operator-matrix.md`](./operator-matrix.md) — migrations 0023–0026, live analytics SQL, Preview SSO (optional).

---

## Production Promote (when PM approves)

1. Merge `content-factory` → `main` (PM only)
2. Vercel Production auto-deploy
3. Smoke: `/`, `/games/2048`, `/profile`, `/admin`
4. Update this log with deploy ID + timestamp
