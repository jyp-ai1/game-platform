# Sprint 12 — RC → GA Checklist (T0 Release Gate)

**Status:** Release Candidate — **NOT GA**  
**Target release:** `v1.12.0`  
**Work order:** [`docs/sprint-12-t0-ga-gate.md`](./sprint-12-t0-ga-gate.md)  
**Sprint 13:** **DO NOT START** until all gates PASS + PM kickoff

---

## Gate Target

| Gate | Current | GA Target |
| --- | --- | --- |
| Senior Developer | ✅ PASS | ✅ PASS |
| Senior QA | 🟡 **HOLD** | **PASS** |
| Senior DevOps | 🟡 **HOLD** | **PASS** |
| Senior AI Engineer | N/A (AI FROZEN) | N/A |
| Operator Readiness | 🟡 **HOLD** | **PASS** |
| PM Release | 🟡 **HOLD** | **PASS** |

**GA commit (candidate):** `1820955` — Sprint 12 Phase 3

---

## T0-1 — QA PASS

**Deliverable:** `docs/reports/sprint-12/qa-report.md` → **PASS**  
**Owner:** Operator

| Area | Scope |
| --- | --- |
| Public | Home · Categories · Game Detail · Missions · Ranking · Save · Resume |
| Browser | Chrome · Edge · Mobile 375px |
| Console | JS Error **0** |
| Network | 500 **0** |
| Admin | CMS · SEO · Analytics · Reports · Players · System · Feature Flag |
| Games | 2048 · Snake · Memory · Breakout · Tetris · SameGame · Arkanoid DX (Pinball **제외**) |

**Automated smoke (2026-07-24):** 36 production URLs → **all 200** ✅

- [ ] Operator functional QA complete  
- [ ] `qa-report.md` → **PASS**

---

## T0-2 — DevOps PASS

**Deliverable:** `docs/reports/sprint-12/devops-report.md` → **PASS**  
**Owner:** Operator

### Rollback Drill (Vercel)

1. Promote previous deployment → timer start  
2. Health check 200  
3. Target **≤ 15s**  
4. Restore latest Production  

Record: `docs/reports/sprint-12/devops-rollback-drill.md`

```bash
git tag -a v1.12.0 1820955 -m "Sprint 12 GA — Operations Platform 2.0"
git push origin v1.12.0
gh release create v1.12.0 --notes-file RELEASE_NOTES_v1.12.0.md
```

- [ ] Rollback drill ≤15s  
- [ ] Tag `v1.12.0` pushed  
- [ ] GitHub Release created  
- [ ] `devops-report.md` → **PASS**

---

## T0-3 — Operator Readiness PASS

**Deliverable:** `docs/reports/sprint-12/operator-readiness-report.md` → **PASS**

---

## T0-4 — Soft Launch (3~7일)

**Deliverables:** [`soft-launch-checklist.md`](./soft-launch-checklist.md) · [`feedback-log.md`](./feedback-log.md) · [`known-issues.md`](./known-issues.md)

- [ ] Daily KPI · CMS 실습 · Major Bug (P0) **0**

---

## T0-5 — Data Review

**Deliverable:** [`reports/soft-launch-summary.md`](./reports/soft-launch-summary.md)

- [ ] DAU · Top/Worst · Bug · Feedback · Retention · Sprint 13 Decision filled
- [ ] Admin data from `/admin/soft-launch` · Reports

---

## T0-6 — PM GA

```
QA + DevOps + Operator + Soft Launch + Data Review PASS → PM GA → v1.12.0
```

- [ ] PM sign-off on `pm-release.md`

---

## Release Deliverables (GA complete)

| Artifact | Status |
| --- | --- |
| `v1.12.0` tag | Pending |
| GitHub Release | Pending |
| `RELEASE_NOTES_v1.12.0.md` | DRAFT |
| QA Report | HOLD |
| DevOps Report | HOLD |
| Rollback Report | Template |
| Soft Launch Summary | [`reports/soft-launch-summary.md`](./reports/soft-launch-summary.md) | Template |
| PM Approval | HOLD |
| Soft Launch log | [`soft-launch-checklist.md`](./soft-launch-checklist.md) | Active |
| Feedback / Issues | [`feedback-log.md`](./feedback-log.md) · [`known-issues.md`](./known-issues.md) | Ready |

---

## Sprint 13 Kick-off

```
Soft Launch 7일 · Major Bug 0 → PM GA → Pinball Phase 1 only
```

**4게임 동시 출시 금지** · **Sprint 13 implementation: ⏸️ HOLD**

---

## Migrations (Operator confirm)

| File | Status |
| --- | --- |
| `0018_sprint12.sql` | ✅ Applied |
| `0019_player_suspend_enforcement.sql` | ✅ Applied |
