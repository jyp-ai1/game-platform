# MP-MOBILE-CONTROL-001 + BOMBER-ONLINE-003

## Commit / Preview
- Commit: `63715f4`
- Preview: https://game29-rl1b9aju9-jyp-ai1s-projects.vercel.app
- Inspect: https://vercel.com/jyp-ai1s-projects/game29/GribkS9peJ8u9CwzqNNFWdUtJuGp
- Play Bomber Classic room: https://game29-rl1b9aju9-jyp-ai1s-projects.vercel.app/games/bomber/play?room=BOMBER-A
- Production: HOLD

## Mobile Control
- Shared: `packages/game-sdk/src/mobile-control-pad.tsx` (left D-pad · right labeled actions)
- Snake: BOOST (hold) · canvas swipe removed
- Agar: SPLIT + EJECT · touch drag-aim disabled (mouse aim kept on PC)
- Bomber: BOMB

## Bomber Online
- Map → roster: Classic/Cross 4 · Maze/Open 6 (no 4/6 picker)
- Map tap → enter immediately · AI fills + moves
- Same Map = same Room: `BOMBER-A|B|C|D`
- Host authoritative tick; stale-host takeover so bombs/AI never freeze
- New human replaces AI seat; leaver → AI refill

## Tests
```
npm test --workspace=@game-platform/game-bomber
→ 15/15 PASS

node --import tsx docs/qa/mp-mobile-bomber-003/sync-sim.mjs
→ bombVisibleOnGuest / explosionSynced / deathResultSame = true
```

## CEO live check (2 PC)
1. Open Preview `/games/bomber/play`
2. Both: Character → Color → ENTER → tap **A · Classic**
3. Confirm HUD room `BOMBER-A`, see each other, plant bombs, explosions match

## Not in scope
- Kick / Glove
- Agar/Snake game logic (control wire only)
- Shell rewrite
- Production promote
