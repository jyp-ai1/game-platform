# MP-CTO-023 TEST RESULT

**Date:** 2026-09-01  
**Preview:** https://game29-lfz4o7vj8-jyp-ai1s-projects.vercel.app  
**Commit:** 9fffe35

## P0 (8/8 required)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Game detail entry | PASS | `game-detail-comments` visible |
| 2 | Comment write | FAIL | POST fails — `game_comments` table missing |
| 3 | Comment list | FAIL | No server rows |
| 4 | Refresh persistence | FAIL | Depends on #2 |
| 5 | Incognito | FAIL | Depends on #2 |
| 6 | Per-game isolation | PASS | Empty lists on bomber (no false positives) |
| 7 | Empty comment reject | PASS | 400, no row created |
| 8 | Game play regression | PASS | Snake play → flagship |

**Score: 4/8 — FAIL**

## Root cause (not code)

Supabase migration `0035_game_comments.sql` **not applied** on linked project.

POST `/api/games/snake/comments` returns migration/env error (503).

**Not a SUPABASE_SECRET_KEY issue** — secret key present on Preview (validation path works for empty comment).

## Min fix to PASS

1. Run `supabase/migrations/0035_game_comments.sql` in Supabase SQL editor
2. Re-run: `QA_BASE_URL=<visit> QA_COMMIT=9fffe35 node tools/qa/mp-cto-023-comments.mjs`
3. Expect 8/8

## Regression (informational)

Snake play OK on Preview. Bomber/Agar detail not re-run this harness (P0 scope = 8 tests above).
