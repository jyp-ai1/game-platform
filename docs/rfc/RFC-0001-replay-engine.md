# RFC-0001: Replay Engine

**Status:** Accepted  
**Layer:** L2 Engine  
**ADR:** ADR-004

## Summary

Replay Engine is the core platform layer. All games import `@game-platform/replay-engine` — never individual services.

## Scope

- Runtime, Stage, Save, Reward
- Multiplayer (via `@game-platform/multiplayer-sdk`)
- Analytics, Notification (stub → production)
- Event Bus, Service Registry

## API

```
ReplayOS.Engine.*
ReplayOS.bus.*
ReplayOS.plugins.*
```

## DoD

See Master Task Engine checklist. Multiplayer cross-device transport is the primary open item.

## Non-Goals

- Game-specific UI
- Creator Studio screens (L6)
- Revenue flows (L7)
