# Game Package Spec — Connect4

**Sprint:** 13 · Epic 2  
**Status:** Design only  
**PM Rating target:** ★★★★★

---

## Overview

| Item | Value |
| --- | --- |
| Slug | `connect4` |
| Title | Connect 4 |
| Category | `board` |
| Difficulty | EASY |
| Play time | 2~4 min |
| Inputs | Column 1–7 tap/click |

---

## Core Loop

1. Player vs CPU (default) or local 2P optional  
2. Drop disc into column  
3. First to connect 4 wins  
4. Score = wins streak or points (win=100, draw=10)  

---

## Game Package Checklist

| Item | Spec |
| --- | --- |
| Save/Resume | Full board + current player turn |
| Leaderboard | Cumulative score or win count |
| Missions | "Connect4 2승" · "3판 플레이" |
| Mobile | Large column hit areas (min 44px) |
| NEW · CMS · SEO · Analytics | Per launch policy |

---

## AI (CPU)

- Minimax depth 4–6 or heuristic win-block  
- Easy mode: random with block  

---

## Game Review Card

[`game-review-card.md`](./game-review-card.md)
