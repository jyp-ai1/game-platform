# Targeted Fix Finalization — Preview QA

```text
Sprint                 Targeted Fix Finalization
Production             game29 · 43f6270 · game29-g4u6m9dur
Vercel                 game29
Legacy game-platform   not used
```

CPO reads this path.

## Preview

| Item | Value |
| --- | --- |
| Vercel Project | **game29** |
| URL | https://game29-htgrwasz6-jyp-ai1s-projects.vercel.app |
| Commit | `91e3a16` |
| Branch | `promote/product-catalog` |
| Environment | Preview – game29 |
| Production | promoted · see Production section |

`preview-qa.json` + `evidence/{snake,agar,bomber,re-front}/`

## Matrix

| Game | CPO last | This Preview | Common Entry | Host/Guest World | Exit | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Snake | FAIL | **PASS** | Character + Color + ENTER | WORLD-6 · Bots 27 · Ping 127–521ms · Minimap | `/games/snake` Detail | No Solo / Practice |
| Agar | PASS | **PASS** | unchanged | Host/Guest `AGAR-PV-S294QI` | Detail | No Agar src change |
| Bomber | PASS | **PASS** | unchanged | Host map 672×672 · Guest `BOMBER-A` World | Detail | No Bomber src change |
| Re:Front | HOLD | **PASS** | unchanged | Host/Guest 2 humans · expand 0.88%→3.22% | Result EXIT visible | 70% Real Victory 136s · Rematch · Another Game |

Solo / PRACTICE / `fallback=1` / `BOMBER-SOLO` / silent Solo: **none**.

## Snake Common Entry

Required: `Detail → ENTER WORLD → Character → Color → ENTER → Multiplayer World → Exit → Snake Detail`

| Check | Result |
| --- | --- |
| Character | PASS |
| Color | PASS — `mp-entry-lobby` Color swatches |
| ENTER CTA | PASS — `mp-enter-world` |
| Multiplayer World | PASS — `/flagship/snake-io/play?room=WORLD` · Room WORLD-6 |
| Bot HUD | PASS — 27 |
| Ping | PASS — numeric `127ms` / `371ms` / `521ms`. `—` not shown |
| Minimap | PASS |
| Exit → Snake Detail | PASS — `나가기` → `/games/snake` |
| Solo / Practice / fallback | none |

Browser: Cursor tab + Playwright Host/Guest. Evidence: `evidence/snake/01-detail.png` · `01b-entry.png` · `02-host-world.png` · `03-guest-world.png` · `04-after-exit.png` · `05-browser-world.png`

## Agar

PASS maintained. CTA `/games/agar/play?room=GL-AGAR`. Host `host` / Guest `guest`. Exit → Detail. No Agar source change.

## Bomber

PASS maintained. No Bomber source change.

- Host Playwright: map 196 tiles · 672×672 · moved · Exit → Detail
- Unique-room script guest hit `Connection failed → Retry / Back` (no Solo). Map A remaps `?room=*` to `BOMBER-A`
- Browser re-QA on `BOMBER-A` while Host stayed in world: Guest entered World, board present, `나가기` present. `evidence/bomber/03-guest-world.png`

## Re:Front

Engine not touched.

| Check | Result |
| --- | --- |
| Host/Guest World | PASS — 2 humans each |
| Expand | PASS — 0.88% → 3.22% then hold to 70% |
| 70% Real Victory → Result | PASS — Territory 70.02% · YOU WIN · EMPIRE COMPLETE · 136s · EXPAND/Space only · no `__RF_QA_END_ROUND__` |
| Rematch | PASS — back in `rf-game-shell` |
| Another Game | PASS — `/games` |
| Result EXIT | Button present on Result (`07-result.png`). This run took Another Game first, so Result EXIT click was not the path used |
| Thumbnail | PASS — `re-front.png?v=3` 1536×1024. Hero shows yellow grid + green territory + Re:Front title. Not a dark UI crop |

Complete Sprint folder `re-front-complete/` was **not** overwritten.

## Thumbnail

`/images/games/re-front.png?v=3` loads (1536×1024). Detail Hero shows the territory map, not an empty black capture. Evidence: `evidence/re-front/01-detail.png` · `01b-hero.png`

## Browser QA

Cursor browser on the same Preview:

- Snake: Color selected → ENTER → WORLD Ping 371 then 127 → `나가기` → `/games/snake`
- Re:Front Detail Hero: identifiable grid + title
- Bomber: Host + Guest on `BOMBER-A` World

## CTO Technical QA

```text
CTO FINAL QA COMPLETE
Game: Snake / Agar / Bomber / Re:Front
Sprint: Targeted Fix Finalization
Path: docs/qa/cpo/mp-cpo-2nd-product-qa/prod-regression/qa-report.md
Commit: 91e3a16
Preview: https://game29-htgrwasz6-jyp-ai1s-projects.vercel.app
CTO Verdict: PASS
Production: game29 · 43f6270 · Bomber shared-shard re-verify PASS
```

## Production

Promoted after CPO Product PASS.

```text
Deployment Target

Vercel Project : game29
GitHub Repository : jyp-ai1/game-platform
Branch : main (FF from promote/product-catalog)

Production
https://game29.vercel.app

Commit
91e3a16

Evidence
efac7e8

Deployment
game29-qxkm6nssp / dpl_B31A2BY8pKsKrDkUxFR1tzgTjdgy
prior promote: game29-h6xf5vq4a

Legacy project
game-platform (Vercel Project) : Removed / Do not use
```

### Production Smoke

`production-smoke.json` + `evidence/production/`

| Check | Result |
| --- | --- |
| URL is `game29.vercel.app` | PASS |
| Catalog Snake / Agar / Bomber / Re:Front | PASS |
| Snake Character + Color + ENTER + WORLD + Ping + Exit → `/games/snake` | PASS — Ping 78ms · Bots 27 · Minimap · no `—` |
| Agar Host/Guest World | PASS — Playwright `host`/`guest` on unique room · browser `GL-AGAR` Host World |
| Re:Front Detail Hero + Host/Guest World | PASS — thumb 1536×1024 `?v=3` · 2 humans · no Practice |
| Bomber Detail + Common Entry | PASS — MULTIPLAYER · ENTER WORLD · no Solo |
| Bomber World + map visibility | **FAIL** — shared shards A–D returned Connection failed. Board 0×0 |
| Bomber fail path | PASS — Connection failed → Retry / Back · no Solo / Practice / `fallback=1` / `BOMBER-SOLO` |
| Solo / Practice / fallback | none on Catalog / Snake / Agar / Bomber / Re:Front |

Same commit `91e3a16` already showed Bomber Host 672×672 on Preview. Production World miss is shared-shard occupancy (live-looking host, no state ack), not a new game-src change.

### Bomber targeted fix (CPO Work Order)

Root cause: BOMBER-A..D keep a leftover host roster. Postgres often omits the sim blob. Guest waited for ack, then treated the leftover row as a live host → Connection failed. No Solo fallback.

Fix (`games/bomber/src/` only): after join-fail or ack timeout, reclaim the shard as Multiplayer Host. Snake / Agar / Re:Front not touched.

| Step | Result |
| --- | --- |
| Preview | https://game29-mqv62lr7k-jyp-ai1s-projects.vercel.app · `43f6270` · Host/Guest `BOMBER-A` 672×672 · no Solo |
| Production | https://game29.vercel.app · `game29-g4u6m9dur` / `dpl_HeAmjt7c5iWdXvwC8wv2SkcZJxv2` · Host 196 tiles 672×672 · Guest 201 tiles 672×672 · no Connection failed · no Solo / Practice / `fallback=1` / `BOMBER-SOLO` |

`bomber-fix-preview.json` · `bomber-fix-production.json` · `evidence/bomber-fix-preview/` · `evidence/bomber-fix-production/`

Snake / Agar / Re:Front were not re-modified. Prior Production smoke PASS for those games still stands.

### Sprint

```text
CPO Product PASS → CTO Production Promote → Production Smoke
Bomber blocker: FIX DEPLOYED · game29 · 43f6270
Preview shared-shard Host/Guest: PASS
Production shared-shard Host/Guest: PASS
Sprint: OPEN — CPO CLOSE 판정 대기
```
