# Sprint 13 — Release Package Audit (14 Games)

**Date:** 2026-07-24  
**Template:** [`templates/game-package-template.md`](../templates/game-package-template.md)

Legend: ✅ PASS · 🟡 PARTIAL · ☐ PENDING · ❌ FAIL

---

## Summary

**14/14 code-side ready** · **0/14 full GA sign-off** (awaiting Operator + QA)

All 14 games: stack-tower, ball-sort, color-sort, penalty-shootout, darts, bubble-shooter, merge-blocks, connect4, reversi, gomoku, bowling, archery, sliding-puzzle, whack-a-mole

---

## Per-Item Matrix (all 14)

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | Game code + wiring | ✅ | PLAYABLE_SLUGS + game-player |
| 2 | Thumbnail | ✅ | PNG + gallery ×3 |
| 3 | SEO metadata | ✅ | Auto from DB |
| 4 | OG image | ✅ | opengraph-image route |
| 5 | Leaderboard | ✅ | reportScore all games |
| 6 | Mission | 🟡 | Category auto; no slug-specific daily |
| 7 | XP / Season | 🟡 | Session hooks; launch XP 2× not coded |
| 8 | Save | ✅ | All 14 (incl. board games fix) |
| 9 | Resume | ✅ | All 14 |
| 10 | Category + rules | ✅ | Migrations 0020/0021 |
| 11 | Featured CMS | ☐ | 0022 seeds new_games |
| 12 | Launch Event | ☐ | 0022 seeds events |
| 13 | Analytics | 🟡 | KPI panel on /admin/analytics |
| 14 | NEW badge | 🟡 | released_at in 0022 |
| 15 | Review Card | 🟡 | Placeholder D+7 |
| 16 | Operation guide | ✅ | docs/games/{slug}-operation-guide.md |
| 17 | QA PASS | ☐ | game-qa-checklist.md |
| 18 | Console/Network 0 | ☐ | QA |
| 19 | Mobile 375px | ☐ | QA |

---

## Operator: apply `0022_sprint13_finalization.sql`
