# Game Package Spec — Mahjong (Solitaire)

**Sprint:** 13 · Epic 4  
**Status:** Design only  
**PM Rating target:** ★★★★★

---

## Overview

| Item | Value |
| --- | --- |
| Slug | `mahjong` |
| Title | Mahjong Solitaire |
| Category | `puzzle` |
| Difficulty | NORMAL |
| Play time | 3~5 min |
| Inputs | Tap matching free tiles |

**Scope:** Solitaire tile-matching — **not** 4-player Mahjong.

---

## Core Loop

1. Layout of stacked tiles (turtle / pyramid)  
2. Select two identical free tiles → remove  
3. Win when board clear; lose when no moves  
4. Score = time bonus + tiles remaining penalty  

---

## Game Package Checklist

| Item | Spec |
| --- | --- |
| Save/Resume | Tile layout + removed set |
| Leaderboard | Best time or highest score |
| Missions | "Mahjong 1판 클리어" |
| Hint | Optional (disabled for ranking board) |
| Shuffle | On dead-end (counts as retry) |
| Mobile | Tile min 40px · scroll/zoom if needed |

---

## Tile Set

- Classic suits + honors simplified for 72–144 tile layouts  
- Ensure solvable generation or curated layouts  

---

## Game Review Card

[`game-review-card.md`](./game-review-card.md)
