# Snake lag — fixed vs deferred

## Fixed (quick wins · content-factory)

- **Ping HUD bug:** `Date.now() - _updatedAt` was session age when room React state did not refresh `_updatedAt` every tick → millions of ms. Now uses inter-arrival of host state samples (guest) / host local 0, clamped 0–999.
- **Double `structuredClone` per tick:** host sim loop cloned the world twice every physics tick; now clones once and keeps the previous object as `before`.
- **HUD ping throttle:** ping state updates at most ~4 Hz.

## Deferred (not in this change)

- **World Delta Sync:** full-world `send("state", next)` every tick is the main multiplayer bandwidth/CPU cost. Replace with dirty-entity / delta patches (snakes moved, food eaten, killFeed append). Non-trivial; schedule after 3-game playtest polish.
- Canvas/WebGL renderer (DOM/React still paints many nodes).
- Worker off-thread simulation.
