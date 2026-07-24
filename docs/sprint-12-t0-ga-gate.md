# Sprint 12 T0 — GA Release Gate (Final)

**Purpose:** RC → **GA (`v1.12.0`)**  
**Sprint 13:** **절대 구현 금지** until GA + Kickoff

---

## Gate Flow (고정)

```
PM (GPT)
    ↓
Senior Developer     ✅ PASS
    ↓
Senior QA (Independent)
    ↓
Senior DevOps Reviewer
    ↓
Operator Readiness
    ↓
Soft Launch (3~7일)    ← 실제 운영 검증
    ↓
Data Review (soft-launch-summary.md)
    ↓
PM GA Approval
    ↓
Production (v1.12.0 GA)
    ↓
Sprint 13 Kickoff (Pinball Phase 1 only)
```

**Sprint 13:** Major Bug 0 · 7일 운영 PASS 후 · **한 번에 4게임 금지**

---

## Current Gate

| Gate | Status |
| --- | --- |
| Developer | ✅ PASS |
| QA | 🟡 HOLD |
| DevOps | 🟡 HOLD |
| AI Engineer | N/A |
| Operator Readiness | 🟡 HOLD (docs ✅ · operator verify pending) |
| PM Release | 🟡 HOLD |

**GA candidate SHA:** `1820955`

---

## T0-1 — QA PASS

**Deliverable:** `docs/reports/sprint-12/qa-report.md` → **PASS**

### Public

- [ ] Home
- [ ] Categories
- [ ] Game Detail (2-column layout)
- [ ] Missions
- [ ] Ranking
- [ ] Save
- [ ] Resume

### Browser

- [ ] Chrome
- [ ] Edge
- [ ] Mobile 375px

### Console / Network

- [ ] JS Error **0**
- [ ] HTTP 500 **0**

### Admin (ADMIN_SECRET)

- [ ] CMS
- [ ] SEO
- [ ] Analytics
- [ ] Reports
- [ ] Players
- [ ] System
- [ ] Feature Flag

### Game Regression (Pinball **제외** — Sprint 13)

| Game | Slug | Save | Resume | Ranking |
| --- | --- | --- | --- | --- |
| 2048 | `/games/2048` | ☐ | ☐ | ☐ |
| Snake | `/games/snake` | ☐ | ☐ | ☐ |
| Memory | `/games/memory` | ☐ | ☐ | ☐ |
| Breakout | `/games/breakout` | ☐ | ☐ | ☐ |
| Tetris | `/games/tetris` | ☐ | ☐ | ☐ |
| SameGame | `/games/samegame` | ☐ | ☐ | ☐ |
| Arkanoid DX | `/games/arkanoid-dx` | ☐ | ☐ | ☐ |

**Owner:** Operator (사용자)  
**Cursor:** Automated smoke only — cannot sign PASS

---

## T0-2 — DevOps PASS

**Deliverable:** `docs/reports/sprint-12/devops-report.md` → **PASS**

### Rollback Drill (Vercel)

```
Previous Deployment → Promote to Production → Restore
```

| Step | Action |
| --- | --- |
| 1 | Vercel → game29 → Deployments |
| 2 | Promote **previous** → start timer |
| 3 | `curl -I https://game29.vercel.app/` → 200 |
| 4 | Stop timer — target **≤ 15s** |
| 5 | Promote **latest** back to Production |

Record: `docs/reports/sprint-12/devops-rollback-drill.md`

### After drill

```bash
git tag -a v1.12.0 1820955 -m "Sprint 12 GA — Operations Platform 2.0"
git push origin v1.12.0
gh release create v1.12.0 --notes-file RELEASE_NOTES_v1.12.0.md
```

**Owner:** Operator

---

## T0-3 — PM Release PASS

**Deliverable:** `docs/reports/sprint-12/pm-release.md` → **PASS**

**Condition (Sprint 12 GA):**

```
Developer PASS + QA PASS + DevOps PASS → PM PASS → Sprint 12 GA
```

---

## T0-4 — Operator Readiness

**Deliverable:** `docs/reports/sprint-12/operator-readiness-report.md` → **PASS**

---

## T0-5 — Soft Launch (3~7일)

**Deliverable:** [`docs/soft-launch-checklist.md`](./soft-launch-checklist.md) · [`docs/feedback-log.md`](./feedback-log.md) · [`docs/known-issues.md`](./known-issues.md)

운영자가 **실제 서비스** 3~7일 운영:

| Daily KPI | CMS 실습 |
| --- | --- |
| DAU · Top Game · Mission · Ranking · Error · Console | 공지 · 배너 · 추천 · Maintenance |

**Exit:** Major Bug (P0) **0** · ≥3일 (권장 7일)

---

## T0-6 — Data Review

**Deliverable:** [`docs/reports/soft-launch-summary.md`](./reports/soft-launch-summary.md)

| Section | Source |
| --- | --- |
| DAU · Top/Worst Game | `/admin/soft-launch` · Analytics |
| Bug · Feedback | `known-issues.md` · `feedback-log.md` |
| Retention · Rates | Reports · Analytics |
| Sprint 13 Decision | PM |

---

## T0-7 — PM GA

**Deliverable:** `docs/reports/sprint-12/pm-release.md` → **PASS**

```
QA + DevOps + Operator + Soft Launch PASS → PM GA → v1.12.0
```

---

## Operator Documentation (Complete)

| Doc | Status |
| --- | --- |
| `docs/operator-manual.md` | ✅ |
| `docs/operator-daily-checklist.md` | ✅ |
| `docs/game-operation-guide.md` | ✅ |
| `docs/game-review-card.md` | ✅ |
| `docs/templates/game-package-template.md` | ✅ |

---

## Release Deliverables (GA 완료 시)

| Artifact | Path |
| --- | --- |
| Version | `v1.12.0` tag |
| GitHub Release | Notes from `RELEASE_NOTES_v1.12.0.md` |
| Checklist | `docs/sprint-12-ga-checklist.md` |
| QA Report | `docs/reports/sprint-12/qa-report.md` |
| DevOps Report | `docs/reports/sprint-12/devops-report.md` |
| Rollback Report | `docs/reports/sprint-12/devops-rollback-drill.md` |
| PM Approval | `docs/reports/sprint-12/pm-release.md` |

---

## Sprint 13 착수 조건

```
Soft Launch 7일 · Major Bug 0
    ↓
PM GA (v1.12.0)
    ↓
Pinball Phase 1 only (4게임 동시 금지)
```

**구현 금지** until above complete.

---

## Sprint 13 방향 (점진적 출시)

**한 번에 4개 만들기 금지.** 게임 1개 → 최소 1주 운영 → 지표 → 다음.

| Phase | Scope |
| --- | --- |
| **Phase 1** | Pinball Release |
| **Phase 2** | Pinball 운영 · Analytics · Retention · 버그 수정 |
| **Phase 3** | Pinball 개선 |
| **Phase 4** | Connect4 (동일 사이클) → Water Sort → Mahjong |

Epic 예: Epic1 Pinball Release · Epic2 Pinball 운영 · Epic3 Pinball 개선 · Epic4 Connect4 …

Package: [`docs/templates/game-package-template.md`](./templates/game-package-template.md) — **19 items**
