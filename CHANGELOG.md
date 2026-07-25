# Changelog

## [Sprint 18 — Re:Play 2.0 Platform Transformation] — 2026-07-25

**Branch:** `content-factory`

### Epic1 — Universal Game Runtime
- Loading → Ready (3-2-1) → Playing → Pause → unified Result modal

### Epic2 — Universal Stage System 2.0
- Per-game ladders: Snake 500/1200/2500, 2048 256→4096, Memory 2×2→5×5

### Epic3 — Multiplayer Foundation
- Waiting Room UI, Web Share / SMS / QR / Copy invite flows

### Epic4 — Game Detail 4.0
- Hero → Play → Top3 → Rank → Achievements → Stages → Journey → Reviews → Similar → Challenge

### Epic5 — Replay Identity
- Journey Identity panel, Wrapped snapshot data structure, heat map live sync

### Epic6 — Community 2.0
- Replies, sort, report, likes count, AI summary

### Epic7 — Live Ranking
- Profile/Journey live sync via extended live-data-bus

### Epic8 — Health Center 2.0
- Top/Worst game, gate dashboard, dynamic AI summary

### Epic9 — AI Operation Pipeline
- Classify → issue drafts → priority → release notes

### Epic10 — Retention Engine
- Coins economy, game-end rewards, Daily + Weekly mission cards on Home

### Epic11–13 — Polish / QA / RC2
- Build PASS, static QA PASS, RC 91% (E2E/accessibility SKIP)

---

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

### Epic8–13 — Sprint16 FINAL

- **E8 Home Polish:** compact hero, visual-first Continue/Daily/Top Players/Recommended
- **E9 Game Detail Final:** hero banner, compact Top3/Record/Achievements flow
- **E10 Community Polish:** mock seed, likes, live comments/ratings UI
- **E11 Health Dashboard:** operator one-screen RC gates
- **E12 Platform Identity:** empty/skeleton states, 404, identity tokens
- **E13 Production Readiness:** full static QA pass (RC 91%)

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
