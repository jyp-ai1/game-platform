# MP-CTO-023 — Comments MVP

## STATUS

IMPLEMENTED (Preview QA pending migration `0035`)

## COMMIT

(uncommitted at report time)

## PREVIEW

(pending deploy — apply migration then verify on game29 Preview Visit URL)

## SCOPE

Game detail → comment write → Supabase `game_comments` → list → refresh/incognito cross-session visibility

**Out of scope:** OAuth, likes, replies, admin delete, notifications, Bomber MP, Game Registration rework

## P0 RESULT

| # | Test | Status |
|---|------|--------|
| 1 | Game detail entry | PENDING Preview |
| 2 | Comment write | PENDING Preview |
| 3 | Comment list | PENDING Preview |
| 4 | Refresh persistence | PENDING Preview |
| 5 | Incognito same comments | PENDING Preview |
| 6 | Per-game isolation | PENDING Preview |
| 7 | Empty comment rejected | CODE (400) |
| 8 | Game play regression | PENDING Preview |

**Preview score:** 0/8 verified (implementation complete)

## AUTOMATED

| Check | Result |
|-------|--------|
| `npm run typecheck` (apps/web) | PASS |
| Validation unit (empty / 500 char) | In `game-comments.ts` |

## BROWSER

Manual Preview checklist (PM):

1. `/games/snake` → Comments section loads
2. Post comment with author + text → appears in list
3. Refresh → comment remains
4. Incognito → same comment visible
5. `/games/bomber` → different slug, no snake comment
6. Empty submit → error message, no row created
7. `/games/snake/play` → still enters game

## REGRESSION

- Game play routing unchanged (`game-detail-template.tsx` comments only)
- Bomber MP: **not touched** (STOP)
- Game Registration (MP-022): **not touched**

## CHANGED FILES

| File | Change |
|------|--------|
| `supabase/migrations/0035_game_comments.sql` | `game_comments` table + RLS read |
| `apps/web/lib/supabase/game-comments.ts` | list/create + validation |
| `apps/web/app/api/games/[slug]/comments/route.ts` | GET + POST API |
| `apps/web/components/game-detail-extras.tsx` | Supabase-backed UI (no localStorage, no OAuth gate) |

## EVIDENCE

- `docs/qa/cpo/mp-cto-023/CTO-FINAL-REPORT.md` (this file)
- API: `GET/POST /api/games/{slug}/comments`
- UI testids: `game-detail-comments`, `comments-author`, `comments-textarea`, `comments-submit`, `comments-list`

## KNOWN LIMITATIONS

- No login — author name is free text (spoofable)
- No likes/replies/delete (by design)
- `community-store.ts` still used elsewhere (Community page, admin moderation) — game detail only migrated
- Requires Supabase migration `0035` + `SUPABASE_SECRET_KEY` for writes

## CTO FINAL

**HOLD** — implementation complete; Preview 8/8 not yet run

## CPO REVIEW

NOT READY — apply migration + Preview QA first

## CEO TEST

HOLD
