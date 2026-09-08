# Production Product Regression — Preview QA

```text
Sprint                 Targeted Fix → Preview QA
Production             NOT DEPLOYED
Vercel                 game29 Preview only
Legacy game-platform   not used for this QA
```

CPO reads this path. No CEO paste required.

## Preview

| Item | Value |
| --- | --- |
| Vercel Project | **game29** |
| URL | https://game29-b24dwz7lu-jyp-ai1s-projects.vercel.app |
| Commit | `163aba7` (fix on `a1d0c74`) |
| Environment | Preview – game29 `6319253770` |
| Production | **not** promoted |

`preview-qa.json` + `evidence/{snake,agar,bomber,re-front}/`

## Matrix

| Game | Detail ENTER WORLD | MORE GAMES = official 4 | Host/Guest | No Solo/Practice | World | Exit |
| --- | --- | --- | --- | --- | --- | --- |
| Snake | PASS | PASS | PASS (WORLD-3) | PASS | PASS | 나가기 visible; lands flagship play not `/games/snake` |
| Agar | PASS | PASS | PASS host/guest `AGAR-PV-*` | PASS | PASS | PASS → Detail |
| Bomber | PASS | PASS | PASS `BOMBER-PV-*` | PASS | PASS — map 672×672, tiles visible | PASS → Detail |
| Re:Front | PASS | PASS | PASS host/guest, 2 humans each | PASS | PASS — expand 0.88% → 3.2% | 나가기 present |

Solo / PRACTICE / `fallback=1` / `BOMBER-SOLO`: **none** on these four.

## CPO checklist notes

**Snake**
- CTA `/games/snake/play?room=WORLD` → SnakeIo flagship (not classic `SnakeGame`)
- Character → ENTER (SnakeIo has no Color step)
- Bot HUD this run: 29 · Minimap: yes · Ping: `—` (clamped; no 3e9 ms)
- Green field is current SnakeIo playfield

**Agar**
- CTA `/games/agar/play?room=GL-AGAR` — no Snake `WORLD` collision
- Connection + Host/Guest World: PASS

**Bomber**
- First Preview (`a1d0c74`) still hid the map (board collapsed to ~2px)
- `163aba7` sizes the common play board — map + 4 players visible

**Re:Front**
- Engine not reverted. World + EXPAND + Host/Guest PASS
- 70% / Result / Rematch / Another Game: not re-ground on this Preview (Complete Sprint evidence stays at `re-front-complete/`)
- `re-front.png` is in git and returns 200. The file itself is a dark UI capture, so Detail hero still looks empty

## Dual project

This QA used **Preview – game29** only. Legacy `Preview – game-platform` also fired on the same SHA — ignored.

## Production

HOLD. CPO approves from this path before any promote.
