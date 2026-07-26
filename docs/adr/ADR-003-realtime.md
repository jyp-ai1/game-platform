# ADR-003: Realtime Transport

**Status:** Accepted  
**Date:** 2026-07-26  
**Layer:** L1 Infrastructure / L2 Engine

## Context

Multiplayer MVP used localStorage — same-browser only. Cross-device required for ecosystem.

## Decision

Transport abstraction in `@game-platform/multiplayer-sdk` / `replay-engine/multiplayer`. Default transport: **Supabase Realtime** (`mp_rooms`, `mp_presence` tables). Dev fallback: memory + BroadcastChannel.

## Consequences

- Engine DoD item "Multiplayer" complete
- All games use `Replay.multiplayer` only — no game-level WebSocket code
