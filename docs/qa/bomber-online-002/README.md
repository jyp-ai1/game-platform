# BOMBER-ONLINE-002 evidence

## Commit / Preview
(filled after deploy)

## Unit tests
```
npm test --workspace=@game-platform/game-bomber
→ 9/9 PASS
```

## Match flow
Detail → WORLD PLAY → Character → Color → ENTER → 4/6 → Map A/B/C/D → MATCH START → Win/Lose/Draw → Retry/Exit

## Sync model (honest)
- Host (room.hostId) runs authoritative `tickBomberWorld` and broadcasts `state` (~80ms) via multiplayer-sdk `send`.
- Guests apply `applyBomberSyncState`.
- Bomb plant also emits `bomber:bomb` for low-latency visibility (A plants → B sees before next full state).
- Guest inputs: `input:{deviceId}` (move / plant) applied on host.
- Soft-wall / item RNG is deterministic (tick+x+y) so host/guest stay aligned when state lands.
- Same-room PC↔PC depends on Supabase realtime transport already used by ensureRoom/joinRoom.
- Solo WORLD: local is host; AI fills empty seats.

## Not in scope
- Kick / Glove / Skull
- Easy/Normal/Hard player UI
- Agar / Snake / Common Shell rewrite
- Production promote (HOLD)
