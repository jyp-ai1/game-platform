# MP-GAME-STANDARD-001

## Verdict

| Gate | Result |
| --- | --- |
| Common Shell | PASS |
| Snake Regression | PASS (invite baseline untouched) |
| Agar Shell | PASS |
| Bomber Shell | PASS |
| Easy / Normal / Hard | PASS (default Normal) |
| Single Game Metadata | PASS (`difficulty` + `gameType`) |

## Preview

https://game29-3lct6dc29-jyp-ai1s-projects.vercel.app

Commit: `f1806d2`

## Changes (related only)

- Shared entry Difficulty: 🟢 Easy · 🟡 Normal · 🔴 Hard
- Detail strip + WORLD PLAY pin (`MpWorldPlayLink`) for Snake/Agar/Bomber
- Agar/Bomber invite → `WORLD-*` room (same pin key; Snake invite logic not deepened)
- Bomber default room `WORLD`
- Agar bot count by difficulty (12 / 18 / 24)
- Creator-prep metadata: `packages/game-sdk/src/game-metadata.ts` + catalog/local-mvp

## Smoke

```text
node docs/qa/mp-game-standard-001/smoke.mjs
```

See `smoke-report.json`.

## Production

HOLD
