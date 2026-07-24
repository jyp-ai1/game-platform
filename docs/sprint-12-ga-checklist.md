# Sprint 12 — RC → GA Checklist (T0 Release Gate)

**Status:** Release Candidate — **NOT GA**  
**Target release:** `v1.12.0`  
**Sprint 13:** **DO NOT START** until all gates PASS + PM kickoff

---

## Gate Target

| Gate | Current | GA Target |
| --- | --- | --- |
| Senior Developer | PASS | PASS |
| Senior QA | **HOLD** | **PASS** |
| Senior DevOps | **HOLD** | **PASS** |
| Senior AI Engineer | N/A (AI FROZEN) | N/A |
| PM Release | **HOLD** | **PASS** |

**GA commit (candidate):** `1820955` — Sprint 12 Phase 3

---

## T0-1 — Documentation (Developer)

| Item | Status |
| --- | --- |
| Gate reports committed to `main` | ✅ PM approved |
| `RELEASE_NOTES_v1.12.0.md` | DRAFT |
| Gate status = docs aligned | Developer PASS · QA/DevOps/PM HOLD |

---

## T0-2 — Operator QA

**Deliverable:** `docs/reports/sprint-12/qa-report.md`

### Operator must execute

| Area | Scope |
| --- | --- |
| Public | Home · Categories · Game Detail · Leaderboard · Save/Resume · Missions · Season |
| Admin | Dashboard · Analytics · CMS · SEO · Reports · Assistant · Monitoring · Flags · Players · Errors · System |
| CMS | Banner · Notice · Event · Featured · Visibility · Maintenance · Audit |
| Browser | Chrome · Edge · Mobile 375px |
| Console | JS Error **0** |
| Network | 500 Error **0** |

**Automated smoke (2026-07-24):** 20 production URLs → **all 200** ✅

**QA Gate:** HOLD until operator completes full matrix → **PASS**

---

## T0-3 — DevOps

**Deliverable:** `docs/reports/sprint-12/devops-report.md`

### Rollback Drill (Operator — Vercel)

1. Vercel → **game29** → Deployments  
2. **Promote** previous deployment → start timer  
3. `curl -I https://game29.vercel.app/` → 200  
4. Stop timer — target **≤ 15s**  
5. **Promote** latest back to Production  

Record: `docs/reports/sprint-12/devops-rollback-drill.md`

### After QA PASS

```bash
git tag -a v1.11.0 <sprint11-ga-sha> -m "Sprint 11 GA"   # if not tagged
git tag -a v1.12.0 1820955 -m "Sprint 12 GA — Operations Platform 2.0"
git push origin v1.12.0
gh release create v1.12.0 --notes-file RELEASE_NOTES_v1.12.0.md
```

**DevOps Gate:** HOLD until rollback drill measured + tag + release

---

## T0-4 — PM Release

**Deliverable:** `docs/reports/sprint-12/pm-release.md`

| Review | Status |
| --- | --- |
| Product | PASS (pending final sign-off) |
| Architecture | PASS |
| QA | HOLD |
| DevOps | HOLD |
| Release | HOLD |

---

## Release Conditions (all required)

- [ ] QA PASS  
- [ ] DevOps PASS (rollback ≤15s · tag · GitHub Release)  
- [ ] Lighthouse PASS or **waiver documented**  
- [ ] `RELEASE_NOTES_v1.12.0.md` finalized  
- [ ] PM PASS  

---

## Sprint 13 Kick-off (after GA only)

```
QA PASS → DevOps PASS → PM PASS → v1.12.0 → sprint-13 branch → Kickoff
```

**Sprint 13 implementation: ⏸️ HOLD**  
Design prep only: [`docs/sprint-13-design-prep.md`](./sprint-13-design-prep.md)

---

## Migrations (Operator confirm)

| File | Sprint 12 |
| --- | --- |
| 0018_sprint12.sql | ✅ Applied |
| 0019_player_suspend_enforcement.sql | ✅ Applied |
