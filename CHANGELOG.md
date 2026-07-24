# Changelog

## [RC1 Candidate — Extended Batch] — 2026-07-25

**Branch:** `content-factory` · **Tag:** `rc1-candidate` (re-tag after push)

### Sprint 15 Extended Batch (quality)

- **Game Quality Sweep:** `npm run qa:verify-games` — 50/50 static SDK PASS + `GameErrorMonitor` (onerror / unhandledrejection)
- **Balance metadata:** Easy/Normal/Hard labels, play time, recommended score, clear time — Admin `/admin/games`
- **Discovery:** Popular, Trending, New, Recommended, Quick Play, Long Play presets
- **Admin analytics:** 50-game KPI table (Play/Finish/Retry/Favorite/Avg Time/Avg Score) + Top/Bottom 10
- **Migration:** `0027_sprint15_balance_metadata.sql` (Operator)

### Added (prior RC1 Candidate)

- Release Package 50/50 (operation guides, review cards, audit JSON)
- SEO: FAQ JSON-LD, game tips section, enhanced metadata
- Discovery: personalized picks, improved related games + search
- Analytics validation matrix (50/50 code PASS)

### Quality (Sprint 15 Epic 1)

- Hydration fixes (profile, header, continue playing, player stats)
- 50/50 Save/Resume/Ranking SDK wiring
- Ready countdown + unified Game Over overlay
- Retry analytics bridge

### Notes

- Developer RC1 Candidate **GO** (PM waived OB-001 for gate)
- Production promote pending PM approval — **no main merge yet**

---

## Prior sprints

See `docs/reports/sprint15/` and `HANDOFF.md` for Sprint 6–15 history.
