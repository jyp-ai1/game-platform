# BOMBER-ONLINE-002 evidence

## Commit / Preview
- Commit: `17be976`
- Preview: https://game29-lriybye9u-jyp-ai1s-projects.vercel.app
- Play: https://game29-lriybye9u-jyp-ai1s-projects.vercel.app/games/bomber/play
- Inspect: https://vercel.com/jyp-ai1s-projects/game29/G6jynHoER2oAeccQLcizTfUj8eyS
- Production: HOLD

## Unit tests
```
npm test --workspace=@game-platform/game-bomber
→ 9/9 PASS
```

## 2-client bomb sync (engine)
```
node --import tsx docs/qa/bomber-online-002/sync-sim.mjs
→ bombVisibleOnGuest / explosionSynced / deathResultSame = true
```

## Match flow
Detail → WORLD PLAY → Character → Color → ENTER → 4/6 → Map A/B/C/D → MATCH START → Win/Lose/Draw → Retry/Exit

## Sync model (honest)
- Host (room.hostId) runs authoritative `tickBomberWorld` and broadcasts `state` (~80ms) via multiplayer-sdk `send`.
- Guests apply `applyBomberSyncState`.
- Bomb plant also emits `bomber:bomb` for low-latency visibility (A plants → B sees before next full state).
- Guest inputs: `input:{deviceId}` (move / plant) applied on host.
- Soft-wall / item spawn is deterministic (tick+x+y).
- Live PC↔PC: open same `?room=CODE` on Preview; first joiner is host.
- Solo WORLD: local is host; AI fills empty seats.

## Not in scope
- Kick / Glove / Skull
- Easy/Normal/Hard player UI
- Agar / Snake / Common Shell rewrite
- Production promote (HOLD)
