# Governance v2.0 — Release Approval Gate

**적용:** Sprint 12 GA 이후 모든 Sprint  
**원칙:** **배포 가능** ❌ → **서비스 운영 준비** ✅

---

## Gate Flow

```
Developer PASS
    ↓
QA PASS
    ↓
DevOps PASS
    ↓
Operator Readiness PASS
    ↓
Soft Launch (3~7일 · Major Bug 0)
    ↓
Data Review (soft-launch-summary.md)
    ↓
PM GA
    ↓
Production
```

**문서 추가 중단** — 운영 경험이 우선. Soft Launch: [`soft-launch-checklist.md`](./soft-launch-checklist.md)

Senior AI Engineer: Sprint 12–13 = **N/A** (AI Freeze)

---

## Sprint 12 GA (T0)

| Gate | Status |
| --- | --- |
| Senior Developer | ✅ PASS |
| Senior QA | 🟡 HOLD |
| Senior DevOps | 🟡 HOLD |
| Operator Readiness | 🟡 HOLD (docs ✅ · operator verify pending) |
| PM Release | 🟡 HOLD |

Sprint 12 GA: Developer + QA + DevOps + PM  
Sprint 13 Kickoff: **위 4 + Operator Readiness PASS**

---

## Sprint 종료 시 제출 (5 Reports + Operator)

| # | Report | Path |
| --- | --- | --- |
| 1 | Senior Developer | `docs/reports/sprint-{N}/developer-report.md` |
| 2 | Senior QA (독립) | `docs/reports/sprint-{N}/qa-report.md` |
| 3 | Senior DevOps | `docs/reports/sprint-{N}/devops-report.md` |
| 4 | Senior AI Engineer | N/A (AI Freeze) or `ai-engineer-report.md` |
| 5 | PM Release | `docs/reports/sprint-{N}/pm-release.md` |
| + | **Operator Readiness** | `docs/reports/sprint-{N}/operator-readiness-report.md` |

---

## 1. Senior Developer Report

Typecheck · Lint · Build · Migration · Changed files · Risks → **PASS / HOLD**

---

## 2. Senior QA Report (독립)

기능 · 회귀 · Chrome · Edge · Mobile 375 · Console 0 · Network 500 0 → **PASS / HOLD**

Sprint 13+ game QA: 3분/10분 플레이 · 30회 재시작 · refresh · network — [`templates/game-package-template.md`](./templates/game-package-template.md)

---

## 3. Senior DevOps Report

배포 · Rollback ≤15s · Tag · Health Check · Migration → **PASS / HOLD**

---

## 4. Senior AI Engineer

**N/A** (Sprint 12–13). AI Sprint 시: Prompt · Token · Hallucination → PASS/HOLD

---

## 5. Operator Readiness (신규)

**목표:** 운영자 **5분** 내 서비스 운영

| Area | Criteria |
| --- | --- |
| **CMS** | 배너 · 공지 · Featured · Maintenance · Hidden · Event — solo |
| **Analytics** | 5초: DAU · Top Game · Mission · Ranking · Play Time · Retention |
| **장애** | 1분: API/DB/게임 오류 · Audit · Deploy |
| **Feature Flag** | 게임 숨김/오픈 · 이벤트/공지 종료 — no dev |

**Docs:** [`operator-manual.md`](./operator-manual.md) · [`operator-daily-checklist.md`](./operator-daily-checklist.md)

→ **PASS / HOLD**

---

## 6. PM Release Report

```
Developer + QA + DevOps + Operator Readiness → PM PASS → Production
```

Sprint 13+ Game Package: **19/19** + Review Card → [`templates/game-package-template.md`](./templates/game-package-template.md)

---

## Operator Docs Index

| Doc | Purpose |
| --- | --- |
| [`operator-manual.md`](./operator-manual.md) | 5분 운영 매뉴얼 |
| [`operator-daily-checklist.md`](./operator-daily-checklist.md) | 매일 체크 |
| [`game-operation-guide.md`](./game-operation-guide.md) | 게임별 가이드 템플릿 |
| [`game-review-card.md`](./game-review-card.md) | D+7 Review |
| [`templates/game-package-template.md`](./templates/game-package-template.md) | 19-item package |

---

## Sprint 13 Kickoff (5 Gates)

- [ ] Senior Developer PASS  
- [ ] Senior QA PASS  
- [ ] Senior DevOps PASS  
- [ ] PM Release PASS  
- [ ] **Operator Readiness PASS**

Work order: [`sprint-12-t0-ga-gate.md`](./sprint-12-t0-ga-gate.md)
