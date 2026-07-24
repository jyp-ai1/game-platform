# Re:Play Development Governance v2.0

> Sprint 12부터 표준 적용. Sprint 11.6에서 도입.

## 개발 조직 (Role)

```
PM (GPT)
        │
        ▼
Senior Developer (Cursor)
        │
        ▼
Senior QA (Independent)
        │
        ▼
Senior DevOps Reviewer
        │
        ▼
Senior AI Engineer (AI Sprint만)
        │
        ▼
PM Release Approval
        │
        ▼
Production Deploy
```

## 원칙

| 원칙 | 설명 |
| --- | --- |
| QA 독립성 | Senior QA는 Developer와 별도 관점·체크리스트로 검증 |
| DevOps | 배포 성공 + Migration + **Rollback 가능 여부** |
| AI Engineer | AI 기능 Sprint — Prompt / Cost / Quality / Architecture |
| PM Gate | PM **PASS** 전까지 Production Release 금지 |
| HOLD | Gate 하나라도 HOLD → 배포 중단, 해당 Gate부터 재검증 |

## Sprint Definition of Done

Sprint 종료 시 **5개 Gate 보고서** + **Deliverables 문서** 필수.

| # | Deliverable |
| --- | --- |
| 1 | `docs/development-governance-v2.md` (본 문서) |
| 2 | `docs/qa-test-plan.md` |
| 3 | `docs/release-checklist.md` |
| 4 | `docs/rollback-guide.md` |
| 5 | `docs/incident-runbook.md` |
| 6 | `RELEASE_NOTES_v{version}.md` |
| 7 | Gate Reports (`docs/reports/sprint-{N}/`) |

## Release Gate (PASS 기준)

| Gate | 승인 조건 |
| --- | --- |
| Senior Developer | 구현 완료, Typecheck / Lint / Build PASS |
| Senior QA | 기능·회귀·모바일·브라우저 PASS (Test Case 문서화) |
| Senior DevOps | Deploy 성공, Migration 확인, Rollback SQL·태그 |
| Senior AI Engineer | AI Sprint만 — Prompt·Cost·Quality PASS |
| PM Release | 제품 목표, UX, 운영성, KPI, 리스크 PASS |

## Sprint 종료 보고서 양식

```
Sprint N 완료보고

1. 구현 기능
2. 변경 파일
3. DB Migration
4. Production URL
5. QA Report          PASS / FAIL
6. DevOps Review      PASS / HOLD
7. AI Engineer Review PASS / HOLD / N/A
8. PM Release         PASS / HOLD
9. Known Issue
10. Rollback Plan
11. 다음 Sprint
```

## Sprint 시작·종료 규칙

**종료:** 모든 Gate PASS → `v1.x.0` Tag → Release Note → Production 확인

**다음 Sprint 시작:**

```
Sprint N PASS → Tag v1.N.0 → Release Note → Production → Sprint N+1
```

## 관련 문서

- [Architecture](./architecture.md)
- [Deployment](./deployment.md)
- [QA Test Plan](./qa-test-plan.md)
- [Release Checklist](./release-checklist.md)
- [Rollback Guide](./rollback-guide.md)
- [Incident Runbook](./incident-runbook.md)
