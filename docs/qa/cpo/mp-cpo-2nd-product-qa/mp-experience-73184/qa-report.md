# WO 73184 — Multiplayer Game Experience & Product Shell

```text
Sprint: OPEN — waiting CPO Product QA
CTO Final QA: PASS
CPO Product QA: pending (read this path, not chat)
```

## Deployment Target

```text
Vercel Project : game29
GitHub Repository : jyp-ai1/game-platform
Branch : promote/product-catalog

Production
https://game29.vercel.app

Commit
9fbb728

Preview Visit
https://game29-8d9mothrt-jyp-ai1s-projects.vercel.app

Production deploy
game29-1n6uoufqw / dpl_3EvB4r1pfV1v4rT5XigkRSyZQqc3

Legacy project
game-platform (Vercel Project) : Removed / Do not use
```

## Pipeline

| Gate | Status |
| --- | --- |
| Implementation | done |
| Local typecheck | PASS (web / game-sdk / snake / bomber / agar) |
| Local browser E2E | PASS — `local-browser.json` |
| Preview Full E2E | PASS — `preview-e2e.json` |
| Production promote | done after Preview Full E2E |
| Production Full E2E | PASS — `production-e2e.json` (24 checks) |
| CTO Final QA | PASS |
| CPO Product QA | **pending** |

## What shipped vs baseline `4319eb2`

- Snake play chrome `← Snake` → Detail
- Snake Connecting card aligned with Agar/Bomber
- Official play remaps `PRACTICE` / `STAGE` → WORLD
- ENTER double-click lock
- Official Detail Recent + hero stay on the 4 flagships (no Discover category leak)
- Official breadcrumb Catalog `/play`
- Catalog + Detail feature lines + ENTER WORLD
- Bomber death → Result immediately; Rematch on `BOMBER-*` re-enters the shard
- Snake `game-profile` `solo: false`
- Agar join_failed / ghost shard → reclaim as Multiplayer Host (Retry/Back if reclaim also fails)

## Production E2E (game29)

24/24 recorded PASS. Evidence: `evidence/production/`.

Confirmed on Production:

- `/play` = official 4 only
- `/games` remains Discover
- Detail ENTER WORLD + feature lines
- Snake PRACTICE URL → WORLD + back chrome
- Agar HUD → Result → Rematch → Another Game → `/play` (not Discover)
- Bomber no Map Select → World → Result on death → EXIT → `/games/bomber`
- Re:Front leaves Character lobby after ENTER
- Mobile catalog 390

Host/Guest: first joiner after ghost/join-fail becomes Host (Preview + Production browser). Dual clients share `GL-AGAR` roster. If a live host already exists, new clients stay Guest — that is the contract, not Solo fallback.

## Forbidden (Product CTA)

PRACTICE · fallback=1 · BOMBER-SOLO · silent Solo · infinite Connecting · Another Game → `/games` · Exit → Home

## CPO next

Product QA once from this path. Sprint stays OPEN until CPO closes it. Do not ask CEO to mid-test.
