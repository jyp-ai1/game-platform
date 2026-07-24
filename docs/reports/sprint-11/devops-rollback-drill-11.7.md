# Sprint 11.7 — DevOps Rollback Drill Log

**Date:** 2026-07-24  
**Result:** **HOLD** — drill must be executed by operator on Vercel

## Pre-conditions

| Item | Value |
| --- | --- |
| Current production commit | `eda9c00` (0017 comment fix) |
| Prior production commit | `b09803a` (Sprint 11.6 docs) |
| Rollback target tag (planned) | `v1.10.5` @ `d7db97d` (pre-Sprint 11.5 SEO, stable CMS) |
| Release tag (planned) | `v1.11.0` @ `eda9c00` after PM PASS |

## Rollback Drill Procedure

### Step 1 — Record current state

```bash
curl -I https://game29.vercel.app/
curl -I https://game29.vercel.app/sitemap.xml
```

Note: Deployment IDs from GitHub (2026-07-24):

- Latest: `5581806841`
- Previous: `5581781826`

### Step 2 — Vercel Instant Rollback

1. Vercel Dashboard → `game29` → **Deployments**
2. Select deployment **before** current (e.g. `b09803a` build)
3. **⋯ → Promote to Production**
4. Start timer → stop when `curl -I https://game29.vercel.app/` returns 200

**Target SLA:** ≤ 15 seconds

| Metric | Operator fill |
| --- | --- |
| Rollback duration | _____ sec |
| Production 200 after rollback | YES / NO |

### Step 3 — Verify rollback

- Home loads
- `/admin/cms` present (if rolled forward) or absent (if rolled back pre-CMS)

### Step 4 — Re-promote current (restore)

Promote latest deployment (`eda9c00`) back to Production.

| Metric | Operator fill |
| --- | --- |
| Re-deploy duration | _____ sec |

## Release Tags (after PM PASS)

```bash
git fetch origin
git tag -a v1.10.5 d7db97d -m "Rollback point: pre-Sprint 11.5 SEO"
git tag -a v1.11.0 eda9c00 -m "Sprint 11: Operations Platform"
git push origin v1.10.5 v1.11.0
gh release create v1.11.0 --title "v1.11.0 Operations Platform" --notes-file RELEASE_NOTES_v1.11.0.md
```

## DB Rollback

See `docs/rollback-guide.md`. **Do not run DB rollback** unless app rollback requires matching schema.

## DevOps Gate

| Check | Status |
| --- | --- |
| Build PASS | ✅ |
| Migration 0010–0017 | ✅ (operator confirmed 0017) |
| Rollback drill measured | **HOLD** |
| Tags v1.10.5 / v1.11.0 | **HOLD** (after PM PASS) |
| GitHub Release | **HOLD** |

**Senior DevOps: HOLD** until rollback timer recorded.
