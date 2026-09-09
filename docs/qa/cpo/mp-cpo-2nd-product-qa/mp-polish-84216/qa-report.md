# WO 84216 — Re:Play Product Polish & Retention

```text
Sprint: 🟡 OPEN · CPO Product QA pending
CTO: DO NOT EXECUTE next WOs. DO NOT ASK FOR NEXT TASK.
CTO Final QA: PASS (technical)
CPO Product QA: pending — CPO reads this folder at Evidence SHA, not a0ce9b1
WO 95631: ⏸ QUEUED — no implementation until this Sprint is CPO CLOSED
```

**CPO: do not judge from Production product SHA `a0ce9b1`.**  
That commit bundled a draft Status table written before Preview/Production E2E.  
The official evidence chain is this folder at **Evidence SHA** below.

Do not overwrite CLOSED `mp-experience-73184/`.  
Do not revert Production product `a0ce9b1`.

## SHA split (required)

| Role | SHA | Meaning |
| --- | --- | --- |
| Product (live Production) | `a0ce9b1` | Game / shell code on game29. Keep. |
| Evidence (read this) | branch HEAD · this file | Preview 22/22 · Production 22/22 · CTO PASS |

`a0ce9b1:docs/qa/cpo/mp-cpo-2nd-product-qa/mp-polish-84216/qa-report.md` is a **draft**. Ignore it.

## Deployment Target

```text
Vercel Project : game29
GitHub Repository : jyp-ai1/game-platform
Branch : promote/product-catalog

Production
https://game29.vercel.app

Product Commit
a0ce9b1

Preview Visit
https://game29-1ytib5mz0-jyp-ai1s-projects.vercel.app

Production deploy
game29-e728ieipo / dpl_2DJrx43CNG2aYCWxCovT6djvXEvZ

Legacy project
game-platform (Vercel Project) : Removed / Do not use

Retired baseline
9fbb728
```

## Evidence chain

```text
Preview Full E2E 22/22     preview-e2e.json      verdict PASS
        ↓
Production Full E2E 22/22  production-e2e.json   verdict PASS
        ↓
CTO Final QA PASS          this file · cto-final.json
        ↓
CPO Product QA             pending — read this SHA, not a0ce9b1
```

## Gates

| Gate | Status | Artifact |
| --- | --- | --- |
| Implementation | PASS | `a0ce9b1` product |
| Local typecheck | PASS | game-sdk · snake · agar · bomber · re-front · web |
| Local Browser E2E | PASS · 22 | `local-browser.json` · `evidence/` |
| Preview Full E2E | PASS · 22 | `preview-e2e.json` · `evidence/preview/` |
| Production Full E2E | PASS · 22 | `production-e2e.json` · `evidence/production/` |
| CTO Final QA | **PASS** | `cto-final.json` |
| CPO Product QA | pending | CPO reads this path at Evidence SHA |

## What shipped (73184 contracts kept)

- Result REMATCH / ANOTHER / EXIT click lock + Score label + outcome (YOU DIED / YOU WIN / DEFEAT)
- Snake Rank·Length · Agar Mass/#place · Bomber place + death shake
- Connect Retry/Back 44px · shared cyan Retry
- Color swatches 44px
- Catalog 16:9 + first-visit Korean summary
- Bomber thumb CSS crop (`scale-125 object-[center_72%]`)
- Agar / Bomber HUD role GUEST (not SYNC)
- Re:Front Result `h-11` + rematch lock — engine / STEP4 untouched
- Snake PRACTICE/STAGE → WORLD (middleware + client guard)
- Official Detail never 404 on HIDDEN DB row — local MVP fallback

## Production regression

```text
NO Solo · NO PRACTICE · NO fallback=1 · NO BOMBER-SOLO
NO silent fallback · NO Exit → Home · NO Another Game → /games
NO Bomber Map Select · NO STEP4
```

Verified on Production `https://game29.vercel.app` @ `a0ce9b1`: catalog 4 · Discover separate · Detail ENTER WORLD · PRACTICE→WORLD · Bomber death→YOU DIED→Exit Detail · Re:Front left lobby · mobile 390.

## CTO Verdict

```text
CTO FINAL QA COMPLETE
Game: Snake · Agar · Bomber · Re:Front
Sprint: WO 84216 Product Polish & Retention
Path: docs/qa/cpo/mp-cpo-2nd-product-qa/mp-polish-84216/qa-report.md
Product: a0ce9b1
Preview: https://game29-1ytib5mz0-jyp-ai1s-projects.vercel.app
CTO Verdict: PASS
Production: game29 a0ce9b1
```

Sprint stays OPEN until CPO Product QA.
