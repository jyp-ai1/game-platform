# Operator Daily Checklist

**목표:** 매일 **5분** — 서비스 상태 + 운영 이슈 조기 발견  
**Production:** https://game29.vercel.app

---

## Morning (5 min)

### 1. Admin Dashboard — 5초 KPI

`/admin` — 6카드 확인:

- [ ] **DAU** — 어제 대비 이상 없음
- [ ] **Retention** — D1 급락 없음
- [ ] **Top Game** — 예상 범위
- [ ] **Play Time** — 급감 없음
- [ ] **Mission Rate** — 0% 아님
- [ ] **Ranking Submit** — 0% 아님

---

### 2. 장애 — 1분

- [ ] `/admin/errors` — **오늘 P0 = 0**
- [ ] `/admin/monitoring` — realtime stats 정상
- [ ] Console spot-check (Home + 1 game) — JS Error **0**

---

### 3. CMS · Deploy — 1분

- [ ] `/admin/cms/audit` — 의도치 않은 변경 없음
- [ ] Vercel Deployments — Production **Ready** (green)
- [ ] 활성 Event/Notice 기간 만료 임박 없음

---

### 4. Feature Flag · Visibility — 30초

- [ ] `/admin/flags` — 의도한 상태 (ranking · save · CMS ON)
- [ ] Maintenance/Hidden 게임 의도와 일치

---

## Weekly (Monday +5 min)

- [ ] `/admin/analytics` — Top 15 games · funnel
- [ ] `/admin/reports` — 주간 export (선택)
- [ ] Sprint 출시 게임 Review Card D+7 확인 ([`game-review-card.md`](./game-review-card.md))
- [ ] NEW 배지 7일 만료 slug — Featured 정리

---

## Incident (when alerted)

→ [`incident-runbook.md`](./incident-runbook.md)

| Severity | Action |
| --- | --- |
| S1 | Rollback immediately |
| S2 | Admin/CMS fix or rollback |
| S3 | CMS Maintenance/Hidden for game |
| S4 | Log · next sprint |

---

## Sprint Gate (T0 only)

Sprint 12 GA / Sprint 13 Kickoff 전:

- [ ] Full QA matrix — [`sprint-12-t0-ga-gate.md`](./sprint-12-t0-ga-gate.md)
- [ ] Operator Readiness — [`operator-manual.md`](./operator-manual.md) §9
- [ ] Report: `docs/reports/sprint-12/operator-readiness-report.md`

---

## Sign-off (optional daily log)

| Date | Operator | DAU OK | Errors 0 | Notes |
| --- | --- | --- | --- | --- |
| | | ☐ | ☐ | |
