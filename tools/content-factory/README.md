# Content Factory (Game Factory)

**Branch:** `content-factory` only — **do not merge to `main` without PM approval.**

Generates Release Package artifacts from a single **Game Manifest**. Games ship to production only via `release/*` after QA.

## Pipeline

```
Game Manifest (JSON)
  → SEO / metadata
  → Supabase migration SQL (games row)
  → CMS SQL (visibility, featured, launch event)
  → Operation guide + Review card
  → Wiring snippets (playable-games, game-player)
  → Release Package checklist (19 items)
  → Mission suggestions
```

Game **code** is still authored or AI-generated separately; this factory handles everything around the game package.

## Quick start

```bash
# Prototype: regenerate Release Package for an existing game
npm run factory:generate -- --manifest tools/content-factory/manifests/stack-tower.json

# Dry-run scaffold for a new slug (no DB/CMS until code exists)
npm run factory:scaffold -- --manifest tools/content-factory/manifests/chess-prototype.json

# Sprint 14 batch — Release Package + scaffolds + thumbnails (content-factory only)
npm run factory:batch -- --manifest tools/content-factory/manifests/sprint-14-batch.json --scaffold-missing --with-thumbnails
```

Output: `tools/content-factory/output/{slug}/` or `output/sprint-14-batch/`

## Manifest

See `schema/game-manifest.schema.json` and `manifests/stack-tower.json`.

Required fields: `slug`, `title`, `category`, `description`, `howToPlay`, `difficulty`, `componentExport`, `features` (`save`, `ranking`).

## Branch policy

| Branch | Purpose |
| --- | --- |
| `main` | Ops stability, hotfix only |
| `content-factory` | New games + factory R&D |
| `release/*` | Release candidates for operator deploy |

## Sprint 14 target

Epic 1–6: extend this CLI with thumbnail generation hook, batch mode (15 games), and optional AI game scaffold from `templates/game-scaffold/`.
