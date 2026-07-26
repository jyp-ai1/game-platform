# ADR-002: Plugin Architecture

**Status:** Accepted  
**Date:** 2026-07  
**Layer:** L2 Engine  
**RFC:** RFC-0002

## Context

50 games cannot each implement ranking, passport, multiplayer separately.

## Decision

Composable plugins in `@game-platform/replay-engine`. Games call `configureGamePlugins([...])` at init.

## Consequences

- One Engine change → all games benefit
- Plugin order and dependencies must stay documented
- New platform features = new plugin, not new game code
