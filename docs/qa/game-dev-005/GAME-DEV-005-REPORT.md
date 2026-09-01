# GAME-DEV-005 — CTO FINAL REPORT

## STATUS

**BLOCKED** — schema migration 0034 not applied on Supabase · build FAIL · Vercel Preview FAIL

## COMMIT

| Field | Value |
| --- | --- |
| Branch | `content-factory` |
| SHA | `d7c5313` |
| Message | fix(schema): add games.play_url migration 0034 and catalog read layer (GAME-DEV-005) |

## PREVIEW

| Field | Value |
| --- | --- |
| Deploy | **FAIL** — Vercel `game29` `dpl_9qxDm7VzHW1JwG3FTVXuHCoXM4Z5` |
| Visit URL | N/A (build fails before usable Preview) |

## SCHEMA

| Check | Result |
| --- | --- |
| 0034 file in repo | ✅ `supabase/migrations/0034_game_external_play_url.sql` (committed `d7c5313`) |
| 0034 applied on Supabase | ❌ **COLUMN_MISSING** (probe: `column games.play_url does not exist`) |
| 0035 modified | ❌ not touched (per rule) |
| games.play_url | **missing on remote DB** |

### Apply 0034 (operator — same as MP-CTO-023 / 0035)

Supabase SQL Editor → project `fecwbzyuktkzrbqqxtid` → Run:

```sql
alter table public.games
  add column if not exists play_url text,
  add column if not exists source_type text not null default 'native'
    check (source_type in ('native', 'external'));

create index if not exists games_source_type_idx on public.games (source_type);
```

Verify: `node tools/qa/probe-play-url.mjs` → status 200 with row data.

Optional automation: set `DATABASE_URL` or `SUPABASE_ACCESS_TOKEN` in `apps/web/.env.local`, then `node tools/qa/apply-migration-0034.mjs`.

## TYPECHECK

```
npm run typecheck (apps/web) — PASS
```

## BUILD

```
npm run build (apps/web) — FAIL
Error: Failed to fetch games: column games.play_url does not exist
Pages: /ranking (and /community on prior runs)
```

Root cause: **schema**, not GAME-DEV-004 UX code.

## VERCEL

| Field | Value |
| --- | --- |
| Project | game29 |
| Commit | d7c5313 |
| Status | failure (same build/prerender error) |
| Env check | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` present locally; `DATABASE_URL` / `SUPABASE_ACCESS_TOKEN` **not** in `.env.local` |

## P0

| Test | Result |
| --- | --- |
| Games list | NOT RUN (no Preview) |
| Snake detail → play | NOT RUN |
| Agar detail → play | NOT RUN |
| Bomber detail → play | NOT RUN |
| External game | NOT RUN |
| Ranking | NOT RUN (local prerender FAIL) |
| Community | NOT RUN (local prerender FAIL) |
| 404 | NOT RUN |
| Mobile | NOT RUN |

Harness ready: `QA_BASE_URL=<Visit URL> node tools/qa/game-dev-005-preview-smoke.mjs`

## REGRESSION

| Area | Result |
| --- | --- |
| Snake | NOT RUN |
| Agar | NOT RUN |
| Bomber Solo | NOT RUN |
| Mobile | NOT RUN |
| Comments | NOT RUN |
| Game Registration | NOT RUN |

## CHANGED FILES

```
supabase/migrations/0034_game_external_play_url.sql  (new)
apps/web/lib/supabase/games.ts                       (play_url, source_type, isExternalGame)
packages/shared/src/types.ts                         (GameSourceType, playUrl, sourceType)
packages/shared/src/index.ts                         (export GameSourceType)
tools/qa/apply-migration-0034.mjs                    (probe + apply helper)
tools/qa/probe-play-url.mjs                          (schema probe)
tools/qa/game-dev-005-preview-smoke.mjs              (Preview smoke harness)
```

## MIGRATION

- **0034**: committed, **not applied** on Supabase
- **0035**: unchanged

## KNOWN LIMITATIONS

1. Migration must be applied in Supabase dashboard (or via `DATABASE_URL` / `SUPABASE_ACCESS_TOKEN`) before build/deploy/smoke can PASS.
2. GAME-DEV-004 UX unchanged; failure is upstream schema gap from MP-CTO-022.
3. External game play/register code exists in working tree but was not in this commit scope (only schema read layer + migration file).

## CTO FINAL

**FAIL** — cannot mark PASS until 0034 applied → build PASS → Preview deploy PASS → smoke PASS.

## CPO REVIEW

HOLD — apply 0034 SQL, re-run build, redeploy game29 Preview, then run smoke harness.

## CEO TEST

HOLD
