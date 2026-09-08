# Production Product Regression — Forensic + Targeted Fix

```text
Sprint                 Targeted Fix (not rollback)
a7ae3aa revert         NOT DONE
Re:Front engine        NOT TOUCHED
Production redeploy    NOT YET
```

Path for CPO: this file.

## Production forensic (game29.vercel.app @ 732e720)

| Surface | Repro | Cause | Fix |
| --- | --- | --- | --- |
| Re:Front thumb broken | PASS | `re-front.png` never in git | commit public thumb |
| MORE GAMES = Breakout / Maze | PASS | `selectRelated` by arcade tags | official 4 only on flagship Detail |
| Snake `/flagship/snake-io` | confirmed | SnakeIo lives there; `GamePlayer` snake = classic `SnakeGame` | canonical `/games/snake/play` → existing flagship redirect |
| Agar Connection failed | PASS on `?room=WORLD` | Agar joined Snake `WORLD` shard | default `GL-AGAR`; remap `WORLD` unless slug=snake |
| Agar unique room | PASS | `AGAR-FORENSIC-1` entered HOST, Mass 12 | — |
| Bomber empty board | PASS | map tiles `absolute` without `relative` parent | `relative` on map layer |
| Snake green / Bot / Ping / Minimap / Exit | in-world | current SnakeIo HUD + playfield; Ping was `3e9 ms` | clamp Ping; Character CTA `START`→`ENTER` |
| Re:Front src rollback | none | Complete Sprint kept | no engine change |
| Dual Vercel Production | confirmed | `game29` + legacy `game-platform` both fire | use **game29 only** |

## Snake entry policy

```text
Catalog CTA     /games/snake/play?room=WORLD
Play page       redirects to /flagship/snake-io/play  (SnakeIo)
Do not          mount classic SnakeGame on Product
```

## Code (this sprint)

- `packages/multiplayer-sdk/src/client/resolve-multiplayer-entry.ts`
- `apps/web/lib/game-catalog.ts`
- `apps/web/lib/product-catalog-sync.ts`
- `apps/web/lib/game-sections.ts`
- `games/agar/src/Agar.tsx` (copy only)
- `games/bomber/src/Bomber.tsx` (map `relative`)
- `games/snake/src/SnakeCharacterSelect.tsx` (`ENTER`)
- `games/snake/src/SnakeIo.tsx` (Ping clamp)
- `apps/web/public/images/games/re-front.png`

## Next

Preview Host/Guest on the 4 official games, then CPO Production approve.
