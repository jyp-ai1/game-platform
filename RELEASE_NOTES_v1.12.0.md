# Release Notes — v1.12.0 (Sprint 12 — Operations Platform 2.0)

**Status:** DRAFT — Gate: QA HOLD · DevOps HOLD · PM HOLD  
**Publish when:** T0-2 QA PASS + T0-3 DevOps PASS + PM sign-off  
**Production:** https://game29.vercel.app  
**GA SHA:** `1820955`  
**Date:** 2026-07-24

---

## Highlights

Sprint 12 completes Re:Play as an **operations platform** — real-time ops, player CRM, feature flags, and release-grade admin tooling. **AI development is frozen** at rules-based assistant; focus shifts to retention in Sprint 13.

---

## Features

### Operations (Admin)

- **Real-time Monitoring** — `/admin/monitoring` (online users, active games, errors)
- **Error Center** — `/admin/errors` (JS/API/404 aggregation)
- **Player CRM** — `/admin/players` (search, detail, suspend, memo)
- **Feature Flags** — `/admin/flags` (CMS, ranking, save, weekly mission, beta games)
- **Report Center** — CSV, Excel export, print/PDF monthly report
- **Notification Hub** — `/admin/notifications` (CMS channel overview)
- **Game Analytics** — `/admin/analytics` (funnel, heatmap, TOP15)
- **AI Assistant** — rules engine + optional `OPS_AI_API_KEY` (**FROZEN — no further AI**)

### Player-Facing

- **Game detail PC redesign** — 2-column layout, sticky ranking, larger canvas
- **Feature flag runtime** — ranking, save, CMS, missions respect admin toggles
- **Monitoring SDK** — client JS error / perf collection

### Database

- `0018_sprint12.sql` — CRM columns, feature_flags, ops RPCs
- `0019_player_suspend_enforcement.sql` — suspended players blocked from score submit

---

## Migrations

Apply in Supabase SQL Editor (if not already):

1. `0018_sprint12.sql`
2. `0019_player_suspend_enforcement.sql`

---

## Rollback

- Vercel: promote previous deployment (target ≤15s)
- Tag rollback point before deploy: prior GA tag
- See `docs/rollback-guide.md`

---

## Known Limitations

- AI Assistant: optional OpenAI; PM frozen additional AI scope
- Lighthouse: use Sprint 11 baseline or PM waiver if unchanged
- Sprint 13 (game launch packages) **not included**

---

## Sprint 13 Preview (Planning only — not in this release)

Pinball · Connect4 · Water Sort · Mahjong — Game Package launch model. See `docs/sprint-13-plan.md`.
