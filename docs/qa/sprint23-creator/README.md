# Sprint 23 — Creator Pipeline Evidence

Pipeline: Draft → Preview → Review → Publish (admin approve in Sprint 24).

- Route: `/creator`
- Registry: `apps/web/data/creator-games.json`
- API: `/api/creator/games`
- Contract: `platform-game-contract` enforced on every creator record
- Stub engine: `2048` template (no AI generator)
- Catalog merge: `mergeCatalogGames()` on home + `/games`

Smoke: `node tools/qa/sprint23-creator-pipeline.mjs`
