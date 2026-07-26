# RFC-0002: Replay SDK & Plugin System

**Status:** Accepted  
**Layer:** L2 Engine  
**ADR:** ADR-002, ADR-006

## Summary

Games compose behavior via Plugins, not copy-paste. CLI scaffolds games with default plugin set.

## Plugins

leaderboard · passport · journey · achievement · collection · multiplayer · ads · analytics · notification · voice · tournament

## API

```typescript
configureGamePlugins(['leaderboard', 'passport', 'analytics'])
ReplayOS.plugins.configure(...)
```

## CLI

```bash
npm run replay -- create-game MyGame
npm run replay -- plugins
```

## DoD

- [x] Plugin registry
- [x] configureGamePlugins
- [x] CLI create-game
- [ ] Plugin isolation tests
