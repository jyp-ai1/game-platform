# Sprint 15 — Difficulty Review

**Date:** 2026-07-24  
**Scope:** PM-requested tuning for retention-sensitive games

---

## Changes applied

| Game | Parameter | Before | After | Rationale |
|------|-----------|-------:|------:|-----------|
| snake | `TICK_MS` | 150 | **165** | Slightly slower tick → easier early survival |
| breakout | `BALL_SPEED` | 220 | **200** | Gentler ball pace for casual players |
| arkanoid-dx | `BALL_SPEED` | 220 | **200** | Match breakout tuning |
| stack-tower | `SPEED` | 2.5 | **2.2** | Slower moving block → more placement time |
| mini-golf | `HOLE_R` | 4 | **5.5** | Larger hole → fewer frustrating near-misses |
| air-hockey | `AI_MAX_SPEED` | 260 | **220** | Weaker CPU for winnable matches |

---

## Reviewed — no change needed

| Game | Notes |
|------|-------|
| chess / chess960 | CPU uses random legal moves (capture-preferring) — already Easy-tier |
| sudoku | Default EASY difficulty via `GIVENS_BY_DIFFICULTY` |
| tic-tac-toe | Minimax CPU — intentional; short sessions |
| whack-a-mole | 30s duration — acceptable for arcade burst |
| tetris | Gravity scales with level — standard progression |

---

## Sprint 16 candidates (data-driven)

After Closed Beta KPI review, tune based on **Bottom10** finish rates:

- Games with Finish Rate < 70%
- Games with Retry Rate < 40%

Pending `analytics_events` data from Epic 2.
