# WO 73184 — Multiplayer Game Experience & Product Shell

```text
Sprint: OPEN
Baseline Production: game29 4319eb2
Vercel: game29
Repo: jyp-ai1/game-platform
```

## Status

| Gate | Status |
| --- | --- |
| Implementation | done (shell + catalog + play-loop gaps) |
| Local typecheck | PASS (web / game-sdk / snake / bomber) |
| Local browser E2E | PASS — `local-browser.json` |
| Preview Full E2E | PASS on `game29-m31ozjvqm` then Agar Host reclaim follow-up |
| Production promote | blocked until Agar join-fail → Host reclaim is on Preview |
| CTO Final QA | pending Preview |
| CPO Product QA | after CTO Final QA + this path |

Do not overwrite CLOSED `multiplayer-productization/` or `prod-regression/`.

## What this Sprint fixes (vs 4319eb2)

- Snake play chrome `← Snake` → Detail (same as Agar/Bomber/Re:Front)
- Snake Connecting card aligned with Agar/Bomber
- Official play refuses `PRACTICE` / `STAGE` → WORLD
- ENTER double-click lock
- Official Detail Recent strip stays on the 4 flagships
- Official Detail breadcrumb Catalog `/play` (not Discover `/games`)
- Official hero no longer links into Discover categories
- Catalog + Detail show per-game feature lines + ENTER WORLD
- Bomber death → Result immediately (not spectate-until-match-over)
- Bomber Rematch on `BOMBER-A/B/C/D` re-enters the shared shard (no local Solo restart)
- Snake `game-profile` `solo: false` matches Product catalog
- Agar join_failed / ghost shard → reclaim as Multiplayer Host (same contract as Bomber; Retry/Back still shown if reclaim also fails)

## Forbidden (Product CTA)

PRACTICE · fallback=1 · BOMBER-SOLO · silent Solo · infinite Connecting · Another Game → `/games` · Exit → Home

## Local E2E

`tools/qa/mp-experience-73184-e2e.mjs` @ `http://localhost:3000`

21 checks PASS. Evidence: `evidence/`.

Bomber QA die → Result overlay → EXIT → `/games/bomber` confirmed.

Agar Host/Guest hooks were not ready on the first local join window (connecting). Re-check on Preview with a longer world wait.
