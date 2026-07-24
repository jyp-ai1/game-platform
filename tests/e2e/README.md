# E2E QA (Playwright)

## Prerequisites

- `npm install` at repo root
- `npx playwright install chromium`
- `apps/web/.env.local` with Supabase keys (games must exist in DB)
- `npm run build --workspace=@game-platform/web`

## Commands

```bash
# Generate 50 game spec files (after playable-games.ts changes)
npm run qa:generate-e2e

# All E2E suites
npm run test:e2e

# 50-game smoke only
npm run test:e2e:games

# Full QA pipeline (static + E2E)
npm run qa:all

# Static only (no server)
QA_SKIP_E2E=1 npm run qa:all

# Regression (static + E2E smoke + 404)
npm run regression
```

## Port

Default E2E server: `http://localhost:3020` (`QA_PORT` to override).

## Screenshot baselines

```bash
QA_SCREENSHOTS=1 QA_UPDATE_SNAPSHOTS=1 npm run qa:all
```

Golden images are gitignored; generate locally before screenshot diff CI.
