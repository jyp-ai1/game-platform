# Game Package Spec — Water Sort

**Sprint:** 13 · Epic 3  
**Status:** Design only  
**PM Rating target:** ★★★★★

---

## Overview

| Item | Value |
| --- | --- |
| Slug | `water-sort` |
| Title | Water Sort |
| Category | `puzzle` |
| Difficulty | NORMAL |
| Play time | 2~5 min / level |
| Inputs | Tap tube A → tap tube B |

---

## Core Loop

1. Pour top color between tubes (same color stack rule)  
2. Empty tube as buffer  
3. Level complete when each tube single color  
4. Score = levels cleared · moves (lower better) or stars  

---

## Game Package Checklist

| Item | Spec |
| --- | --- |
| Save/Resume | Level index + tube states array |
| Leaderboard | Max level or total stars |
| Missions | "Water Sort 레벨 3 클리어" |
| Levels | 20+ procedural or designed set |
| Mobile | Tube tap targets ≥ 48px |
| Undo | Optional 1-step (no ranking abuse) |

---

## Ranking Score Formula (draft)

```
score = level * 1000 - moves * 10
```

Higher is better.

---

## Game Review Card

[`game-review-card.md`](./game-review-card.md)
