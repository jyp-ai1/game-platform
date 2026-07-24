# Game Quality Gate — Release Criteria (Sprint 13)

**Status:** Design only  
**Rule:** Base **10/10 PASS** + **Enhanced QA** before Production

---

## Base Gate (10)

| # | Gate | Pass Criteria |
| --- | --- | --- |
| 1 | **Save** | Mid-game state persists |
| 2 | **Resume** | Reload restores state |
| 3 | **Leaderboard** | Submit + display |
| 4 | **Mission** | Daily/Weekly hooks |
| 5 | **SEO** | metadata · OG · sitemap |
| 6 | **Mobile** | 375px playable |
| 7 | **Performance** | No critical jank |
| 8 | **Accessibility** | Keyboard · focus · contrast |
| 9 | **Analytics** | Play · Finish · Quit · Resume · Favorite |
| 10 | **QA Gate** | Console 0 · Network 500 0 |

---

## Enhanced QA (Sprint 13 — 추가)

| # | Test | Pass Criteria |
| --- | --- | --- |
| 11 | **3분 연속 플레이** | No crash · memory stable |
| 12 | **10분 연속 플레이** | Performance maintained |
| 13 | **30회 재시작** | session_start stable |
| 14 | **브라우저 새로고침** | Resume or graceful reset |
| 15 | **네트워크 끊김** | Offline/online recovery graceful |

---

## Package Docs (19 items)

| # | Item |
| --- | --- |
| 17 | Review Card placeholder |
| 18 | [`game-operation-guide`](../../game-operation-guide.md) per slug |
| 19 | QA PASS (this gate) |

Template: [`../../templates/game-package-template.md`](../../templates/game-package-template.md)

---

## Per-Game Report Row

```
| Pinball | Save ✓ | Resume ✓ | ... | 3min ✓ | 10min ✓ | 30 restart ✓ | QA PASS |
```

**HOLD** if any item fails.

---

## PM Note

기능 개발 ≠ 출시. **출시 패키지 + 운영 문서 + QA** = 하나의 결과물.
