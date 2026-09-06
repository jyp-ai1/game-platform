# 🎮 Re:Play — Feedback Intelligence & QA Prioritization — CTO Report

**Status:** IMPLEMENTED — Preview QA / Migration 0037 pending  
**Baseline:** Game Feedback Ops RELEASE (`6068881`) · Re:Front / STEP 4 frozen

---

## Sprint 목표

> 1분 안에 반복 문제 파악 → Work Order 후보 생성 (AI 자동 수정/배포 ❌)

---

## 구현 요약

### P0-1 Feedback Dashboard (`/admin/feedback`)

- 전체 / 오늘 신규 / `NEW` 카운트
- 게임별 테이블: Agar · Snake · Bomber · Re:Front (Territory War 제외)
- Daily Operations 최근 7일 (BUG · MOBILE · FUN · IDEA · TOTAL)

### P0-2 반복 패턴 탐지

- `lib/feedback-intelligence.ts` — normalized exact match (AI clustering ❌)
- bug / mobile / fun / idea · min 2건
- CPO용 `suggestedPriority` (자동 P0 ❌)

### P0-3 Work Order 후보

- 패턴 카드 → **Work Order 후보 만들기**
- `feedback_work_orders` table + `/api/admin/work-orders`
- Evidence feedback IDs · Acceptance Criteria 자동 초안

### P0-5 Status Workflow

- Admin에서 feedback `status` PATCH (`NEW` → … → `RELEASED`)
- Work Order status 동일 workflow

### P0-6 Feedback Detail

- 원문 content 필수 표시 (AI 요약만 ❌)
- game · type · createdAt · status · releaseVersion · workOrderId

### P0-7 Daily Operations View

- Dashboard 7일 테이블

### P0-8 QA 연결

- Work Order: Game · Type · Problem · Evidence · Priority · Acceptance Criteria

---

## 변경 파일

| File | Role |
| --- | --- |
| `supabase/migrations/0037_feedback_work_orders.sql` | work orders + feedback link |
| `apps/web/lib/feedback-intelligence.ts` | dashboard · patterns · daily |
| `apps/web/lib/feedback-work-orders.ts` | work order CRUD |
| `apps/web/lib/supabase/game-comments.ts` | admin list · status update |
| `apps/web/app/api/admin/feedback/dashboard/route.ts` | ops API |
| `apps/web/app/api/admin/feedback/items/` | list + detail + PATCH |
| `apps/web/app/api/admin/work-orders/` | create + list + PATCH |
| `apps/web/components/admin/feedback-ops-dashboard.tsx` | Admin UI |
| `apps/web/app/admin/feedback/page.tsx` | page |
| `tools/qa/apply-migration-0037.mjs` | migration helper |

**비접촉:** `games/re-front/` · `packages/multiplayer-sdk/` · gameplay

---

## PM Action

1. Supabase SQL Editor: `0037_feedback_work_orders.sql`
2. Preview deploy → `/admin/feedback` (ADMIN_SECRET login)
3. CPO Product QA 5항목 확인

---

## Technical QA

| Item | Status |
| --- | --- |
| Typecheck (web) | 🟢 PASS |
| Build | 🟡 retry (local OOM — TS compile PASS) |
| Feedback API regression | unchanged public routes |
| Re:Front / STEP 4 | 🟢 no changes |

---

## CPO Product QA checklist

1. 오늘 어떤 게임에 문제가 많은가? → game table + daily
2. Bug/Mobile/Fun 반복 패턴? → patterns section
3. 원문 확인? → feedback detail panel
4. Work Order 후보? → pattern button
5. 우선순위 판단? → suggested P1/P2 + manual priority on create
