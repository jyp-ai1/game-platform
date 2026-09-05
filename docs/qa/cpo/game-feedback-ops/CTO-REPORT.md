# 🎮 Re:Play — Game Feedback & QA Operations Foundation — CTO Report

**Status:** READY FOR DEPLOY (Preview QA pending)  
**Re:Front:** 🟡 Frozen — CPO Gate E 대기 (`d9321ba`)  
**STEP 4:** 🟡 HOLD — 코드 비접촉 확인

---

## 1. 현재 댓글 구조 조사

| 항목 | 상태 |
| --- | --- |
| 저장 위치 | Supabase `public.game_comments` (migration 0035) |
| gameId 연결 | `game_slug` text (FK 없음, slug 정규화) |
| 작성 시간 | `created_at timestamptz` |
| 작성자 | free-text `author` (닉네임) |
| 새로고침 persistence | ✅ Supabase SELECT (MP-CTO-023 PASS) |
| 게임별 조회 | ✅ `eq(game_slug)` |
| 정렬 | `created_at DESC` |
| 삭제/관리 | ❌ 없음 (이번 Sprint 범위 외) |
| Community localStorage | 별도 시스템 — 이번 Sprint는 game detail Supabase 경로만 확장 |

**Community vs Game Detail:** game detail = 서버 공유 · Community = 브라우저 localStorage (향후 통합 Epic).

---

## 2. 변경한 데이터 구조

**Migration `0036_game_comment_feedback.sql`**

```sql
game_comments (
  ... 기존 컬럼 ...
  feedback_type text NOT NULL DEFAULT 'opinion'
    CHECK (opinion | bug | idea | fun | mobile)
  status text NOT NULL DEFAULT 'NEW'
    CHECK (NEW | REVIEWING | PLANNED | IN_PROGRESS | QA | RELEASED)
)
```

| 필드 | 용도 |
| --- | --- |
| `game_slug` | 게임별 분류 |
| `feedback_type` | 💬🐛💡🎮📱 유형 |
| `created_at` | 일자별 취합 (UTC YYYY-MM-DD) |
| `content` | 피드백 본문 |
| `status` | 운영 워크플로 (기본 NEW, 사용자 UI 없음) |

**미사용 필드 (향후):** `priority`, `resolvedAt`, `releaseVersion` — 이번 Sprint 추가 안 함.

---

## 3. 변경 파일

| 파일 | 변경 |
| --- | --- |
| `supabase/migrations/0036_game_comment_feedback.sql` | feedback_type + status |
| `apps/web/lib/game-feedback-types.ts` | 타입 상수 · P0 게임 목록 |
| `apps/web/lib/supabase/game-comments.ts` | CRUD 확장 · 일자/게임 집계 |
| `apps/web/app/api/games/[slug]/comments/route.ts` | POST `feedbackType` |
| `apps/web/app/api/admin/feedback/summary/route.ts` | 운영 집계 API (admin auth) |
| `apps/web/components/game-detail-extras.tsx` | 유형 선택 UI (기본 💬 의견) |
| `tools/qa/game-feedback-ops-qa.mjs` | P0 4게임 QA |
| `package.json` | `qa:game-feedback-ops` |

**비접촉 확인:** `games/re-front/`, `packages/multiplayer-sdk/`, Snake delta/snapshot — **변경 없음**.

---

## 4. 게임별 댓글 QA

| 게임 | 작성/새로고침 | Preview QA |
| --- | --- | --- |
| Agar | 구현 완료 | ⏳ Deploy 후 |
| Snake | 구현 완료 | ⏳ Deploy 후 |
| Bomber | 구현 완료 | ⏳ Deploy 후 |
| Re:Front | 구현 완료 (detail page) | ⏳ Deploy 후 |

**QA 명령:**

```bash
npm run qa:game-feedback-ops
# QA_BASE_URL=<deployment-visit-url> QA_COMMIT=<sha> ADMIN_SECRET=<secret>
```

---

## 5. 유형별 저장 QA

- POST `{ feedbackType: "bug" }` → 응답 `comment.feedbackType === "bug"`
- 미지정 → `"opinion"` (기본 💬)
- UI: `<select data-testid="comments-feedback-type">` — 선택적 변경
- migration 0036 미적용 시 legacy fallback (opinion으로 저장, 컬럼 없으면 0035 동작 유지)

---

## 6. 일자별 집계 QA

**Admin API** (cookie auth via `/api/admin/auth`):

```text
GET /api/admin/feedback/summary?date=2026-09-06
→ { total, byGame, byType, games[{ gameSlug, total, byType }] }

GET /api/admin/feedback/summary?listDates=1
→ { dates: [{ date, total }] }
```

P0 게임만 집계: `agar`, `snake`, `bomber`, `re-front` (Territory War 제외).

---

## 7. Typecheck

| Scope | Result |
| --- | --- |
| `@game-platform/web` | ✅ PASS |
| Full monorepo | ⚠️ pre-existing re-front test TS error (unrelated) |

---

## 8. Build

✅ PASS — `next build` 성공, `/api/admin/feedback/summary` 라우트 포함.

---

## 9. Preview URL

⏳ **Commit + Push + Vercel Deploy 후 Visit URL에서 QA**

배포 전 PM Action:
1. Supabase에 migration 0036 적용
2. Push → game29 Preview Deploy
3. `npm run qa:game-feedback-ops` with Preview URL

---

## 10. Regression 결과

| 항목 | Result |
| --- | --- |
| 게임 플레이 영향 | QA script snake play check 포함 — Deploy 후 |
| Product Catalog | 변경 없음 |
| Territory War 재노출 | `DEPRECATED_PRODUCT_SLUGS` 유지 — QA script 포함 |
| STEP 4 Realtime | **비접촉** |

---

## 11. STEP 4 비접촉 확인

```text
packages/multiplayer-sdk     — NO CHANGE
games/*/snake delta/snapshot — NO CHANGE
games/re-front rf:delta/snapshot — NO CHANGE
Supabase transport/channel   — NO CHANGE
```

---

## 12. Commit SHA

⏳ **Not committed** — 사용자 Commit 요청 시 `content-factory` branch에 Push.

---

## 완료 기준 자가 점검

| 질문 | 답 |
| --- | --- |
| 오늘 어떤 게임에 어떤 문제가 몇 건? | ✅ Admin summary API (migration 0036 + deploy 후) |
| CPO가 Work Order로 만들 수 있는가? | ✅ gameSlug + feedbackType + content + status=NEW |

**다음 단계 (이번 Sprint 아님):** AI 자동 수정 · status PATCH API · Community ↔ Supabase 통합 · Creator Studio 연동.

---

## 🚦 운영 상태

```text
STEP 4 Egress          🟡 운영 관찰 / 코드 동결
Re:Front Fun Loop      🟡 CPO Gate E 대기 / 코드 동결
Game Feedback & QA Ops 🟢 구현 완료 → Deploy + migration 대기
```
