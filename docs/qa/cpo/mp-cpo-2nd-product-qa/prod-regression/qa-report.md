# Targeted Fix Finalization — Preview QA

```text
Sprint                 Targeted Fix Finalization
Production             HOLD · NOT DEPLOYED
Vercel                 game29 Preview only
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
| Production | **not** promoted |

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
Production: NOT DEPLOYED · HOLD
```

## Production

HOLD. CPO Product PASS is required before any promote.
