# Targeted Fix — Final Production Evidence

CPO reads this path. CEO handoff is not used.

```text
Sprint                 Targeted Fix Finalization
Vercel Project         game29
Production URL         https://game29.vercel.app
Production SHA         43f6270
Deployment             game29-g4u6m9dur / dpl_HeAmjt7c5iWdXvwC8wv2SkcZJxv2
Branch                 promote/product-catalog
Legacy game-platform   not used
```

## Required close checklist

| # | Item | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Production deploy SHA = `43f6270` | **PASS** | GitHub `Production – game29` @ `43f6270` · alias `https://game29.vercel.app` → `game29-g4u6m9dur` |
| 2 | Bomber Host/Guest 실제 검증 | **PASS** | Host `HOST` · Guest `SYNC` · both on `BOMBER-A` 4P Classic. `evidence/bomber-fix-production/02-host-world.png` · `03-guest-world.png` |
| 3 | Bomber shared shard 정상 진입 | **PASS** | Catalog CTA `/games/bomber/play?room=BOMBER-A`. Host 196 tiles 672×672 · Guest 201 tiles 672×672. `bomber-fix-production.json` |
| 4 | Bomber World / controls 정상 | **PASS** | Grid + 4 corner seats + HUD + Minimap + `나가기` / `전체화면`. Guest frame shows live blast. No Connecting / Connection failed overlay |
| 5 | Connection failure 시 Retry/Back | **PASS** | Product contract unchanged: fail UI is Retry + Back to game, never Solo. Captured on Production `evidence/production/bomber-03-fail-retry.png`. On `43f6270` Host/Guest enter, Connection failed did **not** fire because shard reclaim entered World |
| 6 | Solo / Practice / fallback 없음 | **PASS** | No `PLAY SOLO` · no `PRACTICE` · no `fallback=1` · no `BOMBER-SOLO`. Host/Guest `noFallback: true` |
| 7 | Snake / Agar / Re:Front PASS 유지 | **PASS** | Those games were not modified after Product PASS. Production smoke on `game29.vercel.app`: Snake Ping 78ms Exit→Detail · Agar Host/Guest · Re:Front thumb 1536×1024 Host/Guest 2 humans. `production-smoke.json` · `evidence/production/` |
| 8 | CTO Final QA | **PASS** | See block below |
| 9 | Sprint 최종 상태 | **READY FOR CPO CLOSE** | CTO does not close Product. CPO judges CLOSE from this path |

## CTO Final QA

```text
CTO FINAL QA COMPLETE
Game: Bomber (targeted) · Snake / Agar / Re:Front maintained
Sprint: Targeted Fix Finalization
Path: docs/qa/cpo/mp-cpo-2nd-product-qa/prod-regression/qa-report.md
Production SHA: 43f6270
Production: https://game29.vercel.app
Deploy: game29-g4u6m9dur / dpl_HeAmjt7c5iWdXvwC8wv2SkcZJxv2
CTO Verdict: PASS
Sprint: READY FOR CPO CLOSE
```

JSON: `bomber-fix-production.json` · `final-close.json`

## Production identity

```text
Deployment Target

Vercel Project : game29
GitHub Repository : jyp-ai1/game-platform
Branch : promote/product-catalog

Production
https://game29.vercel.app

Commit
43f6270

Deployment
game29-g4u6m9dur / dpl_HeAmjt7c5iWdXvwC8wv2SkcZJxv2

Legacy project
game-platform (Vercel Project) : Removed / Do not use
```

Snake / Agar / Re:Front source was not changed in the Bomber fix (`43f6270` = bomber shard reclaim only).

---

## History — Preview Product PASS (`91e3a16`)

| Item | Value |
| --- | --- |
| Vercel Project | **game29** |
| URL | https://game29-htgrwasz6-jyp-ai1s-projects.vercel.app |
| Commit | `91e3a16` |
| Evidence | `efac7e8` |
| Environment | Preview – game29 |

`preview-qa.json` + `evidence/{snake,agar,bomber,re-front}/`

| Game | This Preview | Notes |
| --- | --- | --- |
| Snake | **PASS** | Character + Color + ENTER · WORLD-6 · Ping numeric · Exit `/games/snake` |
| Agar | **PASS** | Host/Guest World · no Agar src change |
| Bomber | **PASS** | Host 672×672 · Guest `BOMBER-A` |
| Re:Front | **PASS** | 70.02% Victory 136s · Rematch · Another Game · hero `re-front.png?v=3` |

Solo / PRACTICE / `fallback=1` / `BOMBER-SOLO`: **none**.

## History — first Production smoke (`91e3a16`)

`production-smoke.json` + `evidence/production/`

Snake / Agar / Re:Front Production World **PASS**. Bomber shared shards **FAIL** (Connection failed → Retry/Back, no Solo). That Bomber FAIL is **superseded** by `43f6270` below.

## History — Bomber targeted fix

Root cause: `BOMBER-A..D` leftover host roster. Postgres often omits sim state. Guest ack timeout treated the row as a live host → Connection failed.

Fix (`games/bomber/src/` only): join-fail or ack timeout → reclaim shard as Multiplayer Host. No Solo fallback.

| Step | Result |
| --- | --- |
| Preview | https://game29-mqv62lr7k-jyp-ai1s-projects.vercel.app · `43f6270` · Host/Guest `BOMBER-A` 672×672 |
| Production | https://game29.vercel.app · Host/Guest `BOMBER-A` 672×672 |

`bomber-fix-preview.json` · `evidence/bomber-fix-preview/`
