# ADR-003: Realtime Transport

**Status:** Proposed  
**Date:** 2026-07  
**Layer:** L1 Infrastructure / L2 Engine

## Context

Multiplayer MVP uses localStorage — same-browser only. Cross-device required for ecosystem.

## Decision (Proposed)

Transport abstraction in `@game-platform/multiplayer-sdk`. Swap `localStorageTransport` → Supabase Realtime or WebSocket without game changes.

## Consequences

- Engine DoD item "Multiplayer" blocked until this ships
- No game-level WebSocket code allowed
