## MP-INVITE-003

Commit: `4908bb8dba7e09ed3501fd4abe3ca897e2d41400`
Preview: https://game29-kuddtg8s0-jyp-ai1s-projects.vercel.app

### Room

PC:
ROOM=WORLD-I361
MODE=WORLD
SOURCE=INVITE

Mobile:
ROOM=WORLD-I361
MODE=WORLD
SOURCE=INVITE

Same Room: PASS

### Peer

PC sees Mobile: PASS
Mobile sees PC: PASS

### Starting State

Initial Length: 10
Initial Gem Count: 2400 ambient (foodCountCap=2400 @ 50P WORLD) + ~195 death-tier
Initial Gem Value: ambient Small=1 · Medium=2 · Large=3 · Epic=20 (death-tier separate)

### Gem Growth

Small: +1
Medium: +2
Large: +3

L10 → 정상 성장: PASS (10 → 24 after few eats)
L500 급상승: PASS (no spike)

### Fallback

Invite → Practice fallback: NO

### Root cause WORLD-4 vs WORLD-YXT

Share created alphabetic invite shard `WORLD-YXT` and pinned it in `play29:active-room`. Host then clicked WORLD PLAY (`?room=WORLD`). On mount, `pinActiveRoom("WORLD")` overwrote the invite pin with bare `WORLD`, so cluster resolve landed host on `WORLD-4` while Mobile kept `WORLD-YXT` from the invite URL.

Fix: never pin bare WORLD; prefer pinned WORLD-* on quick play; share/redirect embed `source=invite` + concrete room; WORLD PLAY CTA uses pinned invite room; invite connect failure shows retry (no PRACTICE).

Developer Gate only — CEO final PASS pending
Production: HOLD
