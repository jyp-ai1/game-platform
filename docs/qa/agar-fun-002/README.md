# AGAR-FUN-002 Evidence

Headless engine probe: `npx tsx docs/qa/agar-fun-002/probe.mjs` → `probe-report.json`

## Scope
- Files: `games/agar/src/agar-io-engine.ts`, `games/agar/src/Agar.tsx`, `games/agar/src/index.ts`
- Snake / Bomber / Platform shell: untouched

## Probe gates (ALL_PASS)
| Gate | Result |
| --- | --- |
| Mass Decay | PASS (260→220 idle ~10s) |
| Virus (center + paths, n=11) | PASS |
| Virus Split (not death) | PASS (1→8 cells) |
| Split Fragments Eat | PASS (40→47+) |
| Space Split + cooldown | PASS |
| W Backward Eject | PASS (ejectX < cell.x) |
| TOP10 changes | PASS |
| 1st can lose rank | PASS |

## Performance (probe sample)
- Virus count: 11
- Cell count: ~18–21
- Food: ~160–170
