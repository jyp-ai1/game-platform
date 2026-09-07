# Re:Front Long Sprint — CTO Final QA

## Gate

```text
4/4 MP Product Gate   🟢 CLOSED (a7ae3aa)
Snake / Bomber / Agar not re-QA’d
Re:Front Long Sprint  CTO PASS
CPO Product QA        pending
Production            🔒 HOLD
```

## Product

Flow verified on Preview:

```text
Detail → ENTER WORLD → Character/Color → ENTER
→ EXPAND play → Territory 70.02%
→ Result YOU WIN
→ REMATCH → new World
→ second real 70% win
→ EXIT → /games/re-front
```

| Item | Result | Evidence |
| --- | --- | --- |
| Detail + ENTER WORLD | PASS | 01-detail.png |
| Entry lobby | PASS | 02-entry.png |
| Core gameplay (EXPAND) | PASS | 03-core-gameplay.png |
| Progress toward 70% | PASS | 04-progress-or-state.png — 8.59% |
| Real win/lose | PASS | 05-real-win-or-lose.png — `69.9% → 70.0%`, Territory `70.0% / 70%`, YOU WIN |
| Result | PASS | 06-result.png — REMATCH / ANOTHER GAME / EXIT |
| Rematch | PASS | 07-rematch-or-another-game.png — back in World at 0.9% |
| Exit | PASS | 08-exit.png — `/games/re-front` |

**Was 70% reached by real play?** YES.

Win path is `applyExpand` until `territoryPct >= 70`. `__RF_QA_END_ROUND__` was not used. HUD popup shows `+1 TERRITORY · 69.9% → 70.0%`. PLAYERS roster `RFComplete 70.02%`.

Lose path: if the last human is eliminated, the round ends and the local player sees DEFEAT. Covered by unit test `eliminating the last human ends the round with a bot winner`.

UX: first screen still says EXPAND + `70%면 승리`. EXPAND stays available after the tutorial. Hold EXPAND keeps claiming the next yellow tile. Confirm copy uses tutorial vs normal gold/pop. No Practice / Solo fallback.

## Technical

- Developer QA: unit tests 11/11 PASS (`@game-platform/game-re-front`)
- Automated QA: `rf-victory.test.ts` reaches 70% via `applyExpand`; last-human eliminate ends the round
- Browser QA: Chromium 1280×900, room `RF-DONE-MTRER02J`, first win in 21s of real expands
- Regression: Re:Front tests only. Snake / Bomber / Agar not run
- Console / Practice / fallback: none
- MP Common Contract / STEP4 / SDK: unchanged

### Changed files

- `games/re-front/src/re-front-engine.ts` — `RF_GRID` 32, expand cost 4, bot expand softened, last-human defeat
- `games/re-front/src/re-front-missions.ts` — EXPAND in every phase; first combat → free
- `games/re-front/src/ReFront.tsx` — next-tile arm, hold EXPAND, confirm copy
- `games/re-front/src/__tests__/*` — victory, first-session, sync size, guest camera
- `.cursor/rules/cto-handover.mdc` — Long Sprint rule

### Build

- Repository: jyp-ai1/game-platform
- Branch: promote/product-catalog
- Game commit: `462bb5f`
- Preview: https://game29-3rkccrsqx-jyp-ai1s-projects.vercel.app
- Production: NOT DEPLOYED

## Evidence

- evidence/01-detail.png
- evidence/02-entry.png
- evidence/03-core-gameplay.png
- evidence/04-progress-or-state.png
- evidence/05-real-win-or-lose.png
- evidence/06-result.png
- evidence/07-rematch-or-another-game.png
- evidence/08-exit.png
- qa-report.json

## CTO Verdict

PASS
