# MP-CTO-023 — Comments MVP

## STATUS

FAIL (Preview 4/8 — migration blocker)

## COMMIT

9fffe35

## PREVIEW

https://game29-lfz4o7vj8-jyp-ai1s-projects.vercel.app

Deployment: dpl_48XTbo3jxJ2zGWJzjkuLBcAMCXEM

## SCOPE

Game detail comments → Supabase `game_comments` → cross-session visibility

**Excluded:** OAuth, likes, replies, admin, Bomber MP, Game Registration rework

## P0 RESULT

| # | Test | Result |
|---|------|--------|
| 1 | Game detail entry | PASS |
| 2 | Comment write | FAIL |
| 3 | Comment list | FAIL |
| 4 | Refresh persistence | FAIL |
| 5 | Incognito | FAIL |
| 6 | Per-game isolation | PASS |
| 7 | Empty comment reject | PASS |
| 8 | Game play regression | PASS |

**4/8 Preview FAIL**

## AUTOMATED

```
node tools/qa/mp-cto-023-comments.mjs
QA_BASE_URL=https://game29-lfz4o7vj8-jyp-ai1s-projects.vercel.app
QA_COMMIT=9fffe35
→ 4/8 FAIL
```

| Check | Result |
|-------|--------|
| typecheck | PASS (pre-commit) |
| Harness | `tools/qa/mp-cto-023-comments.mjs` |

## BROWSER

Preview Playwright run @ 2026-09-01 — see `verify-report.json`, `screenshots/`

## REGRESSION

Snake `/games/snake/play` → flagship — PASS (harness #8)

## CHANGED FILES

| File | Change |
|------|--------|
| `supabase/migrations/0035_game_comments.sql` | New table + RLS read |
| `apps/web/lib/supabase/game-comments.ts` | list/create + validation |
| `apps/web/app/api/games/[slug]/comments/route.ts` | GET + POST |
| `apps/web/components/game-detail-extras.tsx` | Supabase UI |
| `tools/qa/mp-cto-023-comments.mjs` | 8 P0 harness |
| `tools/qa/apply-migration-0035.mjs` | Migration probe helper |

## EVIDENCE

```
docs/qa/cpo/mp-cto-023/
├── CTO-FINAL-REPORT.md
├── verify-report.json
├── TEST-RESULT.md
├── deploy-out.txt
└── screenshots/
    ├── 01-detail-entry.png
    ├── 02-comment-write.png
    ├── 03-after-refresh.png
    ├── 04-incognito.png
    ├── 05-bomber-no-snake-comment.png
    └── 06-snake-play.png
```

## KNOWN LIMITATIONS

- **Blocker:** migration 0035 not applied on Supabase — `game_comments` table missing
- Author name free text (no auth) — by design for MVP
- Community page still uses localStorage — out of scope

## CTO FINAL

**FAIL**

## CPO REVIEW

**NO**

## CEO TEST

**HOLD**

---

### Min fix (no new Gate)

Apply `0035_game_comments.sql` → re-run harness → expect 8/8 PASS → CPO REVIEW READY

**Do not open MP-024.**
