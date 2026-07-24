# Sprint 12 — Operations Platform 2.0

**Status:** IN PROGRESS (Phase 3 — T5/T6 complete, gates pending)  
**Governance:** v2.0  
**Theme:** 운영 자동화 + AI 기반 운영 도구

---

## Sprint 11 선행 조건 (Release Gate)

Sprint 12는 PM 부재 중 **Phase 1 개발 착수** (2026-07-24). GA 게이트는 Sprint 11 완료 후 병행 처리.

| Gate | Required |
| --- | --- |
| Senior QA | PASS — 130 cases executed, 0 P0 FAIL |
| Senior DevOps | PASS — Rollback drill 실측, `v1.11.0` tag, GitHub Release |
| PM Release | PASS |

---

## Phase 1 구현 현황 (Developer)

| Task | Status | Notes |
| --- | --- | --- |
| **T0** Monitoring SDK | DONE | `lib/monitoring`, `MonitoringProvider` |
| **T1** Real-time Dashboard | DONE | `/admin/monitoring` |
| **T2** Player CRM | DONE | `/admin/players`, detail, suspend, memo |
| **T3** Notification Center | DONE | `/admin/notifications` CMS hub |
| **T4** Feature Flag | DONE | Runtime wired — CMS, ranking, save, weekly mission, beta games |
| **T5** Report Center | DONE | CSV · Excel (.xls) · Print/PDF |
| **T6** AI Assistant | DONE | LLM (OPS_AI_API_KEY) + rules fallback |
| **Phase 2** | DONE | SDK platform-flags, suspend enforcement (`0019`) |
| **Phase 3** | DONE | Analytics page, export API, AI panel |
| **T7–T10** QA/DevOps/PM | PENDING | Governance gates |

**Migration:** `0018_sprint12.sql` — applied  
**Migration:** `0019_player_suspend_enforcement.sql` — applied

---

## Sprint 12 목표

게임 추가가 아닌 **운영 플랫폼 고도화**:

- Real-time monitoring (Grafana-style ops view)
- Player CRM
- Report Center (CSV/Excel/PDF)
- Error Center
- Notification Center (unified ops comms)
- Feature Flag (no-deploy toggles)
- **AI Operation Assistant** (차별점)

---

## Epics

### Epic 1 — Real-time Monitoring

운영 Dashboard:

- 현재 접속자 / 오늘 플레이 / 현재 플레이 중
- 에러 / 응답 속도
- API · DB · Storage · Vercel health

### Epic 2 — Player CRM

`/admin/players`

- 검색 · 필터 · 상세 (XP, Level, 최근 플레이/저장/접속)
- Suspend · Memo · Activity timeline
- (향후) 닉네임 변경 · 공지 · Push

### Epic 3 — Report Center

- CSV · Excel · PDF export
- 월간 보고서 자동 생성: DAU, Retention, Top Game, Mission, Leaderboard

### Epic 4 — Error Center

- JS Error · API Error · 404 · 500 · Supabase Error
- 게임별 / 시간대별 집계

### Epic 5 — Notification Center

CMS 확장 — 한 화면에서:

- 공지 · Push · 이벤트 · 배너

### Epic 6 — Feature Flag

Runtime toggle (배포 없이):

- Weekly Mission · Ranking · Save · CMS · Beta Game

### Epic 7 — AI Operation Assistant

- DAU 감소 원인 분석
- 추천 게임 / 공지 초안 / 배너 문구 / 이벤트 기획
- **Senior AI Engineer Review 필수** (Prompt, Cost, Hallucination, Latency)

---

## Tasks (T0–T10)

| Task | Scope |
| --- | --- |
| **T0** | Monitoring SDK — Error, Performance, Session, API, Network |
| **T1** | Real-time Dashboard — Online, Active Games, Errors, Health |
| **T2** | Player CRM — Detail, Search, Suspend, Memo, Activity |
| **T3** | Notification Center — Notice, Push, Event, Banner unified |
| **T4** | Feature Flag — runtime toggle |
| **T5** | Report Center — CSV, Excel, PDF, monthly auto-report |
| **T6** | AI Operation Assistant — ops summary, anomaly, content drafts |
| **T7** | Independent QA — regression, mobile, Lighthouse, a11y, browsers |
| **T8** | DevOps — rollback drill, tag, release, backup, migration |
| **T9** | AI Engineer Review — prompt, cost, quality, caching, model |
| **T10** | PM Release Approval |

---

## Architecture (유지)

```
Game → Game SDK → Analytics → CMS → Dashboard → Admin
```

Sprint 12는 Admin/Analytics 계층 **확장** — 게임 패키지 추가 최소화.

---

## DoD (Governance v2.0)

- Typecheck / Lint / Build PASS
- QA PASS (independent)
- DevOps PASS (rollback measured)
- AI Engineer PASS (T6 포함 시)
- PM PASS → Production Deploy
- Release Notes + Rollback verified

---

## PM Note

Sprint 11 Product **A (90%)** · Architecture **A+** — Sprint 12는 **Operation B+ → A** 를 목표로 Real-time Ops + AI Assistant에 집중.
