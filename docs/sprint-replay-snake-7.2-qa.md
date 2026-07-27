# Sprint 7.2 — Gameplay Polish QA

Preview: _(after deploy)_  
Gate: **Sprint 8 blocked until all PASS**

## P0 — Fullscreen

| # | Test | PASS | FAIL |
|---|------|------|------|
| FS1 | Fullscreen canvas fills viewport (square, max size) | ☐ | ☐ |
| FS2 | Camera/viewport resizes with fullscreen | ☐ | ☐ |
| FS3 | PC Chrome/Edge native fullscreen | ☐ | ☐ |
| FS4 | Mobile Safari/Chrome (native or pseudo-fullscreen) | ☐ | ☐ |
| FS5 | Exit restores normal layout | ☐ | ☐ |

## P0 — Camera & motion

| # | Test | PASS | FAIL |
|---|------|------|------|
| C1 | Camera lerp feels smooth (0.08–0.10) | ☐ | ☐ |
| C2 | No sudden camera jumps | ☐ | ☐ |
| C3 | Movement visually smoother (interpolation) | ☐ | ☐ |
| C4 | Tick rate unchanged (20Hz feel) | ☐ | ☐ |

## Sprint 8 — Character (add to gate)

| # | Test | PASS | FAIL |
|---|------|------|------|
| H1 | Character select before START | ☐ | ☐ |
| H2 | 10 heads selectable | ☐ | ☐ |
| H3 | Choice saved in localStorage | ☐ | ☐ |
| H4 | My head emoji visible in game | ☐ | ☐ |
| H5 | Other players show different head emojis | ☐ | ☐ |

## Regression (7.1)

| # | Test | PASS | FAIL |
|---|------|------|------|
| R1 | Spawn YOU → input → GO | ☐ | ☐ |
| R2 | Retry flow | ☐ | ☐ |
