# Sprint 11 — RC1 → GA Checklist

**Status:** Release Candidate 1 — **NOT GA**  
**Target release:** `v1.11.0`  
**Sprint 12:** **DO NOT START** until all gates PASS

---

## Gate Target

| Gate | Current | GA Target |
| --- | --- | --- |
| Senior Developer | PASS | PASS |
| Senior QA | HOLD | **PASS** |
| Senior DevOps | HOLD | **PASS** |
| Senior AI Engineer | N/A | N/A |
| PM Release | HOLD | **PASS** |

---

## Priority 1 — Three Tasks (Operator)

### ① CMS 운영 QA (~30 min)

Login: https://game29.vercel.app/admin (`ADMIN_SECRET`)

| # | Check | Pass? |
| --- | --- | --- |
| 1 | Banner create / delete / ON-OFF | ☐ |
| 2 | Notice create (urgent, maintenance, update, event) | ☐ |
| 3 | Event create (period, reward, game link) | ☐ |
| 4 | Featured game (weekly / editor / trending) → home reflects | ☐ |
| 5 | Visibility → Visible | ☐ |
| 6 | Visibility → **Maintenance** on test game → game page blocks play | ☐ |
| 7 | Visibility → **Hidden** → game 404 | ☐ |
| 8 | Audit log: action + **IP + User-Agent + before/after** (0017) | ☐ |

After completion: update `docs/reports/sprint-11/qa-report.md` → **PASS**

Reference: `docs/qa-test-plan.md` CMS-001 – CMS-030

---

### ② Rollback Drill (~5 min)

1. Vercel → project **game29** → **Deployments**
2. Note current Production deployment
3. **Promote** previous deployment to Production — **start timer**
4. Verify `curl -I https://game29.vercel.app/` → 200
5. **Stop timer** — record: `_____ sec` (target ≤ 15s)
6. **Promote** latest deployment back to Production

Record in: `docs/reports/sprint-11/devops-rollback-drill-11.7.md`

Example PASS: `Rollback 14.2 sec`

---

### ③ Release (after ①② PASS)

```bash
git fetch origin
git tag -a v1.10.5 d7db97d -m "Rollback point: pre-Sprint 11.5 SEO"
git tag -a v1.11.0 <GA-commit-sha> -m "Sprint 11: Operations Platform GA"
git push origin v1.10.5 v1.11.0

gh release create v1.11.0 \
  --title "v1.11.0 — Operations Platform" \
  --notes-file RELEASE_NOTES_v1.11.0.md
```

Update `RELEASE_NOTES_v1.11.0.md` status: DRAFT → **RELEASED**

---

## Pre-GA Verification (Cursor / Operator)

```bash
curl -I https://game29.vercel.app/sitemap.xml   # must be 200
curl -I https://game29.vercel.app/robots.txt    # 200
```

**Known P0 fix:** sitemap hardened in latest commit — deploy then re-test.

---

## Lighthouse (PM waive optional)

| URL | Perf | SEO | Note |
| --- | ---: | ---: | --- |
| `/` | 81 | 100 | Perf < 95 — waive or Sprint 12 |
| `/games/2048` | 63 | 100 | Game page heavier |

---

## After GA

```
Sprint 11 PASS → v1.11.0 → Sprint 12 Kick-off (Operations Platform 2.0)
```

See: `docs/sprint-12-plan.md` (planning only — **no implementation until GA**)
