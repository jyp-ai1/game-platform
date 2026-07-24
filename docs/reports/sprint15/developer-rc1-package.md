# Sprint 15 — Developer RC1 Package

**Generated:** 2026-07-25 (Extended Batch — RC1 hardening)  
**Branch:** `content-factory`  
**Developer scope:** **100%** · QA/Operator: pending human validation

---

## Summary

| Area | Status | Artifact |
|------|--------|----------|
| Release Package 50/50 | ✅ | `docs/games/*-operation-guide.md` · `docs/reports/game-reviews/*` |
| Game Quality Sweep | ✅ 50/50 | `npm run qa:verify-games` · `game-quality-sweep.md` |
| Balance metadata | ✅ 50/50 | `lib/game-balance.ts` · `/admin/games` · `0027` migration |
| Discovery UX | ✅ | Presets + search + sort + category |
| Admin analytics (50) | ✅ | `/admin/analytics` · Top/Bottom 10 |
| Analytics code validation | ✅ 50/50 | `analytics-matrix.md` |
| Build / Lint / Typecheck | ✅ | Extended batch verify |
| Preview Product QA | ⏳ | OB-001 waived · human QA tomorrow |

---

## Release Package (50/50)

- **Operation guides:** `docs/games/{slug}-operation-guide.md` ×50
- **Review cards:** `docs/reports/game-reviews/{slug}-2026-07.md` ×50
- **Per-game audit JSON:** `docs/reports/sprint15/release-packages/{slug}.json`
- **Summary:** `docs/reports/sprint15/release-packages/_summary.json`

Regenerate: `npm run factory:sync-rc1`

---

## SEO

| Item | Implementation |
|------|----------------|
| Meta description | `buildGameMetadata()` — includes howToPlay snippet |
| Keywords | title, tags, `{title} 하는법` |
| Open Graph / Twitter | per-slug OG image route |
| JSON-LD VideoGame | `gameJsonLd()` |
| JSON-LD FAQ | `gameFaqJsonLd()` — how to play, difficulty, free |
| On-page tips | `GameTipsSection` on game detail |
| Nostalgia copy SQL | `0026_sprint15_nostalgia_notes.sql` (Operator) |

---

## Discovery UX

| Feature | Location |
|---------|----------|
| Discover presets | Popular · Trending · New · Recommended · Quick Play · Long Play |
| Similar games (tag+category score) | `selectRelated()` |
| 오늘의 추천 | `PersonalizedPicksSection` on home |
| 추천순 sort | `/games` discovery browser |
| Search slug/howToPlay | `searchGames()` |
| Recently played / favorites views | existing |

---

## Game Quality Sweep

- **Script:** `npm run qa:verify-games`
- **Report:** `docs/reports/sprint15/game-quality-sweep.md`
- **Runtime monitor:** `GameErrorMonitor` on game pages (onerror + unhandledrejection → analytics)

---

## Balance Metadata

- **Lib:** `apps/web/lib/game-balance.ts` — play time, recommended score, clear time, session type
- **Labels:** Easy / Normal / Hard (`lib/difficulty.ts`)
- **Admin:** `/admin/games` — 50-game balance table
- **Migration:** `0027_sprint15_balance_metadata.sql`

---

## Admin Analytics (50 games)

- **Panel:** `AllGamesKpiPanel` — Play, Finish, Retry, Favorite, Avg Time, Avg Score
- **Rankings:** Top 10 / Bottom 10 by plays (+ finish rate)
- **RPC:** `get_game_kpis_batch` extended with retries + avg_play_time_sec (0027)

---

## Analytics Matrix

- **Code scan:** `npm run analytics:validate` → `analytics-matrix.md`
- **Result:** 50/50 PASS (SDK hooks in game source)
- **Operator SQL:** see `analytics-validation.md`

---

## QA / Operator (not Developer)

| Item | Owner |
|------|-------|
| Preview SSO OB-001 | Operator |
| Product QA Sessions 4–7 | Senior QA |
| Live analytics_events SQL | Operator |
| Migrations 0023–0027 apply | Operator |
| Production promote | DevOps + PM |

---

## Related Documents

- [`rc1-release-summary.md`](./rc1-release-summary.md) — NO GO until Preview QA
- [`qa-signoff.md`](./qa-signoff.md)
- [`game-certification.md`](./game-certification.md)
- [`../sprint16/sprint16-kickoff.md`](../sprint16/sprint16-kickoff.md)

---

## Senior Developer Sign-off

**Developer scope:** COMPLETE — HOLD for P0/P1 hotfix only.

**Next human gate:** Operator closes OB-001 → QA → RC1 GO.
