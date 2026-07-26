# ADR-004: Replay Engine Package

**Status:** Accepted  
**Date:** 2026-07  
**Layer:** L2 Engine  
**RFC:** RFC-0001

## Context

`@game-platform/replay-sdk` grew into full platform surface. Need clear Engine boundary.

## Decision

- `@game-platform/replay-engine` = OS core (Engine, Bus, Registry, Plugins)
- `@game-platform/replay-sdk` = backward-compat shim for games
- `@game-platform/game-sdk` = low-level engagement/save (internal)

Games SHOULD import replay-engine; replay-sdk re-exports for migration.

## Consequences

- Single import path for new games
- Layer violations visible in dependency graph
