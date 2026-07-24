# Game Package Template — Sprint 13+

**Version:** 19 items (Sprint 13 PM 확정)  
**Rule:** **전부 PASS** before Production GA  
**Per game:** Pinball · Connect4 · Water Sort · Mahjong · …

---

## Package Checklist (19)

| # | Item | Deliverable | PASS |
| --- | --- | --- | --- |
| 1 | **Game** | `games/{slug}` · `PLAYABLE_SLUGS` · `game-player.tsx` | ☐ |
| 2 | **Thumbnail** | `generate-thumbnails.mjs` · `/public/games/{slug}/` | ☐ |
| 3 | **SEO** | metadata · title · description | ☐ |
| 4 | **OG** | Open Graph · Twitter card | ☐ |
| 5 | **Leaderboard** | score → `ranking_submit` | ☐ |
| 6 | **Mission** | Daily/Weekly slug hooks | ☐ |
| 7 | **XP** | season/mission XP on events | ☐ |
| 8 | **Season** | season progress hooks | ☐ |
| 9 | **Save** | mid-game persist | ☐ |
| 10 | **Resume** | reload restore | ☐ |
| 11 | **Category** | Supabase `games` row + category | ☐ |
| 12 | **Featured** | CMS featured slot | ☐ |
| 13 | **Launch Event** | CMS event (NEW · XP 2×) | ☐ |
| 14 | **Analytics** | Play · Finish · Retry · Quit · Resume · Favorite | ☐ |
| 15 | **CMS** | visibility · audit trail | ☐ |
| 16 | **NEW Badge** | 7 days from `released_at` | ☐ |
| 17 | **Review Card** | placeholder → D+7 update · Admin display | ☐ |
| 18 | **운영 가이드** | `docs/games/{slug}-operation-guide.md` | ☐ |
| 19 | **QA PASS** | Game Quality Gate + enhanced QA | ☐ |

---

## Game Info (fill per game)

```yaml
game_name: Pinball
slug: pinball
category: arcade
released_at: YYYY-MM-DD
difficulty_stars: 4
pm_recommend_stars: 5
target_play_time_min: 3
```

---

## QA — Enhanced (Sprint 13)

기존 + 아래 **전부 PASS**:

| # | Test |
| --- | --- |
| 1 | Save |
| 2 | Resume |
| 3 | Leaderboard |
| 4 | Mission |
| 5 | SEO (view source / OG debugger) |
| 6 | Mobile 375px |
| 7 | **3분 연속 플레이** — 크래시·메모리 없음 |
| 8 | **10분 연속 플레이** — 성능 유지 |
| 9 | **30회 재시작** — session_start 안정 |
| 10 | **브라우저 새로고침** — Resume 또는 graceful reset |
| 11 | **네트워크 끊김** — offline/online 복구 (graceful) |
| 12 | Performance |
| 13 | Accessibility |
| 14 | Analytics events fire |
| 15 | Console 0 · Network 500 0 |

→ Full gate: [`../sprint-13/specs/game-quality-gate.md`](../sprint-13/specs/game-quality-gate.md)

---

## Analytics Events (Sprint 13)

| Event | When |
| --- | --- |
| `session_start` / Play | Game load + start |
| `game_end` / Finish | Round complete |
| `game_quit` / Quit | Exit before finish |
| `game_resume` / Resume | Saved state loaded |
| Retry | 2+ session_start same day |
| `favorite_add` / Favorite | Bookmark |
| Share | **추후** (Sprint 14+) |

---

## Game KPI (D+7 Review)

| KPI | Definition |
| --- | --- |
| **7일 생존율** | Slug players returning D7 |
| **첫 플레이율** | First play / card impressions |
| **재플레이율** | Retry % |
| **즐겨찾기율** | Favorite % |

→ [`../game-review-card.md`](../game-review-card.md)

---

## Documents to Create

| Doc | Path |
| --- | --- |
| Operation Guide | `docs/games/{slug}-operation-guide.md` |
| Review Card (launch) | `docs/reports/game-reviews/{slug}-{YYYY-MM}.md` |
| Game spec | `docs/sprint-13/specs/{slug}.md` |

---

## Sign-off

| Role | Name | Date | Result |
| --- | --- | --- | --- |
| Senior Developer | | | PASS / HOLD |
| Senior QA | | | PASS / HOLD |
| PM | | | PASS / HOLD |

**19/19 PASS** → Game Package GA eligible
