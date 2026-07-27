# Replay Live Deployment Process

## Branches

```
main          → production.replay.gg (auto deploy)
feature/*     → Preview URL (Vercel) → QA → merge main
hotfix/*      → bugfix only, no new features
```

## Release flow

```
feature/*
    ↓
Preview deploy
    ↓
QA PASS (see docs/sprint-replay-snake-*-qa.md)
    ↓
Merge → main
    ↓
Production auto deploy
    ↓
Release note + Discord/community notice
```

## Version plan

| Version | Focus |
|---------|-------|
| v0.8.1 | Gameplay Feel (growth, eat pop, food density) |
| v0.8.2 | Character body color |
| v0.9 | Progression (Lv, Title, Border, Pattern unlock) |

## Rules

- **Preview:** feature development + QA only
- **Production:** QA PASS features only
- **Hotfix:** bug fixes only; no new features
- **Release notes:** record changes per version

## Analytics (Sprint 11 — from launch)

Funnel: Join → Spawn → Death → Retry → Play Time → Foods → Boost → Quit
