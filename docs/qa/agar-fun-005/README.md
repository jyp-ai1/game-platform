# AGAR-FUN-005 — Collision Response Instant

## Verdict
Contact-based auth collision (not deep-swallow). Overlap max **33ms** (1 tick). Legacy chase deep-swallow estimate was **~1848ms**.

## Pipeline
Physics → Auth State → Network(N/A) → Interpolation(**none**) → Render(setState)

Root cause was **detection threshold** (deep swallow), not interpolation.

## Probe
```bash
npx tsx docs/qa/agar-fun-005/probe.mjs
```

See `probe-report.json`.

## Production
HOLD
