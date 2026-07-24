# Sprint 13 — Analytics & CMS Audit

**Date:** 2026-07-24  
**Gate:** Epic 2  
**Environment:** https://game29.vercel.app

---

## Production Smoke

| Target | HTTP | Notes |
| --- | --- | --- |
| 14 new game pages | **14/14 × 200** | Regression URL check |
| `/admin/analytics` | 200 | Sprint 13 KPI panel deployed |
| `/admin/cms/events` | 200 | Launch events manager |
| `/admin/cms/featured` | 200 | new_games slot |

---

## Analytics — 14 New Games

| Event | Code Path | QA Verify |
| --- | --- | --- |
| Play (session_start) | `RecentlyPlayedRecorder` | ☐ 1 play → KPI Play +1 |
| Finish (game_end) | SDK / game over | ☐ Finish% updates |
| Ranking | `reportScore` → ranking_submit | ☐ After game over |
| Favorite | Game detail favorite button | ☐ favorite event |
| Save / Resume | `useAutoSave` + ResumeDialog | ☐ Refresh mid-game |
| Mission | Category session hooks | ☐ Profile missions |
| XP / Season | Session start hooks | ☐ Profile XP |

**Admin:** `/admin/analytics` → **Sprint 13 신규 게임 KPI (14)** table  
**RPC:** `get_game_kpis_batch` (migration 0022)

---

## CMS — Post 0022

| Item | Expected | Operator Verify |
| --- | --- | --- |
| Launch Events × 14 | `cms_events.game_slug` set | ☐ `/admin/cms/events` |
| Featured `new_games` × 14 | Active rows | ☐ `/admin/cms/featured` |
| Visibility × 14 | `visible` | ☐ `/admin/cms/visibility` |
| `released_at` | Populated on 14 games | ☐ Supabase games table |
| Home `new_games` slot | CMS or fallback selectNew | ☐ Homepage |

---

## Epic 2 Sign-off

| Role | Status |
| --- | --- |
| Developer | ✅ Smoke PASS |
| Operator | 🟡 CMS visual verify |
| QA | ☐ Event fire verify |
