# ADR-006: SDK Layering

**Status:** Accepted  
**Date:** 2026-07  
**Layer:** L2 Engine  
**RFC:** RFC-0002

## Context

game-sdk, multiplayer-sdk, replay-sdk, replay-engine — risk of confusion.

## Decision

```
L1: Supabase, CI, Deploy
L2: replay-engine (public) ← replay-sdk (compat) ← game-sdk + multiplayer-sdk (internal)
L3: RuntimeProvider, universal result (web app)
```

Games never import multiplayer-sdk directly — only ReplayOS.Engine.Multiplayer.

## Consequences

- Clear dependency direction
- Refactors stay in L2 packages
