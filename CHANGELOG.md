# Changelog

## [Sprint 16 — Re:Play Identity Pivot] — 2026-07-25

**Branch:** `content-factory` · **Commits:** `161768c` → `3ea1c9a`

### Epic3 — Home Experience 3.0

- Visual hero (80% visual / 20% text): gradient, floating game cards, Play · Discover CTAs
- Continue hub featured card, Daily Challenge + 5분 목표, Top3 strip
- Rule-engine “For You” recommendations (no AI)

### Epic4 — Game Detail 2.0

- Play-first vertical flow: Play → Stats/Top3 → Recent → Rating/Comments → Next Game
- Similar games carousel, compact header

### Epic5 — Community

- Top Players + Daily Challenge ranking
- Comments, star ratings, bug report (localStorage MVP)
- Recent activity feed from play history

### Epic6 — Replay Identity (complete)

- Replay DNA panel, favorites collection strip
- Replay Score + monthly/yearly cards (prior commit)

### Epic7 — Operator Health

- `/admin/health` — RC score, quality gates, operator links
- Windows regression runner grep pipe fix

---

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
