# Game Package Spec — Pinball

**Sprint:** 13 · Epic 1  
**Status:** Design only — **no implementation until GA kickoff**  
**PM Rating target:** ★★★★★

---

## Overview

| Item | Value |
| --- | --- |
| Slug | `pinball` |
| Title | Pinball |
| Category | `arcade` |
| Difficulty | NORMAL |
| Play time | 2~5 min / ball |
| Inputs | Left flipper · Right flipper (keyboard / touch zones) |

---

## Core Loop

1. Launch ball into playfield  
2. Hit bumpers · targets · ramps for score  
3. Ball drains → life lost or game over  
4. High score → ranking prompt  

---

## Game Package Checklist

| Item | Spec |
| --- | --- |
| Play complete | Canvas/WebGL or DOM physics, 60fps target |
| Save/Resume | Optional mid-ball freeze; table state minimal |
| Leaderboard | Total score per session |
| XP/Season | `recordScoreReport` on every round |
| Daily Mission | e.g. "Pinball 1판" |
| Weekly Mission | e.g. "Pinball 3판" · "5000점" |
| SEO | Title · description · OG image |
| Thumbnail | Arcade neon style |
| NEW badge | 7 days from `released_at` |
| CMS Event | "Pinball 출시 · XP 2×" |
| Analytics 6 | CTR · Play · Finish · Retry · Time · Ranking% |
| Mobile 375px | Touch flipper zones left/right 40% width |

---

## Scoring

- Bumper: 10~100  
- Combo multiplier optional  
- Ranking: highest single-session score  

---

## Game Review Card (post-launch)

Template: [`game-review-card.md`](./game-review-card.md)

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Physics jank on mobile | Cap ball speed · simplify collisions |
| Long sessions | Auto game-over at 5 min or 3 balls |
