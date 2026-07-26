# RFC-0006: Universal Runtime

**Status:** Accepted  
**Layer:** L3 Gameplay  
**Depends on:** RFC-0001 Engine

## Summary

All 50 games use `RuntimeProvider` — loading → tutorial → ready → playing → gameover → reward → continue. No exceptions.

## Components

- `runtime-provider.tsx`
- `game-result-modal.tsx`
- `game-framework.ts` reward hook

## DoD

- [x] 50 games via GameDetailTemplate
- [x] Universal reward bundle
- [ ] Multiplayer result flow (H2H)
- [ ] Runtime config per-game from platform, not game code

## Rule

New games MUST NOT implement custom result modals.
