# WO 84216 — Re:Play Product Polish & Retention

```text
Sprint: OPEN
Baseline Production: game29 9fbb728
Vercel Project: game29
Repo: jyp-ai1/game-platform
Official evidence: docs/qa/cpo/mp-cpo-2nd-product-qa/mp-polish-84216/
```

Do not overwrite CLOSED `mp-experience-73184/`.

## Status

| Gate | Status |
| --- | --- |
| Implementation | PASS |
| Local typecheck | PASS (game-sdk · snake · agar · bomber · re-front · web) |
| Local browser E2E | PASS · `local-browser.json` · 22 checks |
| Preview Full E2E | pending commit / deploy |
| Production | blocked until Preview Full E2E |
| CTO Final QA | after Preview + Production evidence |
| CPO Product QA | after CTO Final QA |

## What changed (73184 contracts kept)

- Result REMATCH / ANOTHER / EXIT click lock + Score label + outcome
- Snake / Agar rank·mass metrics; Bomber YOU WIN / DRAW / DEFEAT / YOU DIED + place
- Connect Retry/Back `h-11` + shared cyan Retry
- Color swatches 44px
- Catalog 16:9 cards + first-visit Korean summary
- Bomber thumb CSS crop (`scale-125 object-[center_72%]`) — source PNG unchanged
- Agar / Bomber role label GUEST (not SYNC)
- Re:Front Result `h-11` + rematch lock (engine untouched, STEP4 untouched)
- Snake PRACTICE/STAGE → WORLD via middleware + client guard
- Official Detail never 404 when DB row is HIDDEN — local MVP fallback

## Local E2E

- Catalog 4 + ENTER WORLD + Discover separate
- Detail 4/4 ENTER WORLD, no PRACTICE / fallback / BOMBER-SOLO
- Snake PRACTICE → `/flagship/snake-io/play?room=WORLD`
- Bomber no Map Select · death → Result YOU DIED · Exit → `/games/bomber`
- Re:Front left Character lobby after ENTER
- Mobile catalog 390

## No regression

```text
NO Solo · NO PRACTICE · NO fallback=1 · NO BOMBER-SOLO
NO silent fallback · NO Exit → Home · NO Another Game → /games
NO Bomber Map Select · NO STEP4
```
