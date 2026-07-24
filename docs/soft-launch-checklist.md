# Soft Launch Checklist

**Phase:** Sprint 12 RC → Soft Launch → GA (`v1.12.0`)  
**Duration:** **3~7일** 실제 운영  
**Production:** https://game29.vercel.app  
**Goal:** 운영자가 실서비스를 돌려보며 **Major Bug 0** 확인

---

## Pre-Launch (T0 — Gate PASS)

Soft Launch 시작 전 **전부 PASS**:

- [ ] **QA** — `docs/reports/sprint-12/qa-report.md` PASS
- [ ] **DevOps** — Rollback ≤15s · `v1.12.0` tag · GitHub Release
- [ ] **Operator Readiness** — `docs/reports/sprint-12/operator-readiness-report.md` PASS

Gate flow: [`sprint-12-t0-ga-gate.md`](./sprint-12-t0-ga-gate.md)

---

## Soft Launch Start

| Item | Value |
| --- | --- |
| Start date | __________ |
| Operator | __________ |
| GA candidate SHA | `1820955` |
| Target GA tag | `v1.12.0` |

---

## Daily KPI (매일 체크 — 5분)

[`operator-daily-checklist.md`](./operator-daily-checklist.md) 참고

| KPI | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **DAU** | | | | | | | |
| **Top Game** | | | | | | | |
| **Mission Rate** | | | | | | | |
| **Ranking Submit** | | | | | | | |
| **Errors (P0)** | 0 | | | | | | |
| **Console JS** | 0 | | | | | | |

**Soft Launch KPI minimum:** Error P0 = **0** · Console = **0** every day

---

## CMS 실습 (Soft Launch 중 1회 이상)

운영자가 Production Admin에서 **실제 수정**:

- [ ] **공지** — Notice 등록 · 수정 · 종료
- [ ] **배너** — Banner 추가 또는 교체
- [ ] **추천게임** — Featured slot 변경
- [ ] **NEW** — (Sprint 13 전까지 N/A 또는 기존 게임 featured)
- [ ] **Maintenance** — 1게임 Maintenance → 복구 테스트

Manual: [`operator-manual.md`](./operator-manual.md)

---

## Incident Log

버그·이슈 발생 시:

1. [`known-issues.md`](./known-issues.md) — 즉시 기록  
2. [`feedback-log.md`](./feedback-log.md) — 운영자/유저 관찰  
3. P0 → [`incident-runbook.md`](./incident-runbook.md)

---

## Soft Launch Exit Criteria

| Criterion | Required |
| --- | --- |
| 운영 일수 | **≥ 3일** (권장 7일) |
| **Major Bug (P0)** | **0** |
| Daily KPI logged | ✅ |
| CMS 실습 | ✅ |
| Operator sign-off | ✅ |

---

## After Soft Launch → PM GA

```
Soft Launch PASS (7일 · Major Bug 0)
    ↓
PM GA sign-off — pm-release.md PASS
    ↓
Sprint 13 Kickoff (Pinball Phase 1 only)
```

**Sprint 13 시작 조건:** 7일 운영 · Major Bug 0 — **문서 PASS가 아니라 운영 PASS**

---

## Sign-off

| Role | Date | Result |
| --- | --- | --- |
| Operator | | PASS / HOLD |
| PM | | GA approved / HOLD |

**Notes:**
