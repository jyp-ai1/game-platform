# GAME-DEV-004 — Game Discovery & Detail UX Improvement

## STATUS

**IMPLEMENTED** — typecheck PASS · Preview deploy FAIL (Vercel) · local build compiles, prerender fails on unrelated DB schema

## COMMIT

| Field | Value |
| --- | --- |
| Branch | `content-factory` |
| Commits | `86af400` (UX) · `0e2cb0b` (client-safe fix) |
| Primary SHA | `0e2cb0b` |

## PREVIEW URL

| Field | Value |
| --- | --- |
| Deploy | **FAIL** — Vercel `game29` deployment for `86af400` failed (`dpl_5QXRGghQbiv3oUu45WJ2mhE2Ujcm`) |
| Visit URL | N/A until Vercel deploy succeeds |
| Note | Per Release Rule v2, dev continues; PM re-trigger deploy when quota/build fixed |

## 변경 파일

```
apps/web/lib/game-discovery-ui.ts          (new — shared summary/creator helpers)
apps/web/lib/game-catalog.ts               (DISCOVERY_CARD_CTA)
apps/web/components/game-card.tsx          (summary, creator, detail link)
apps/web/components/platform-game-card.tsx (summary/creator UI, card→detail overlay)
apps/web/components/game-detail-hero.tsx   (creator in hero)
apps/web/components/game-detail-template.tsx (Play-first panel, Community section)
```

## Scope delivered

| Item | Change |
| --- | --- |
| `/games` cards | Title, genre, **creator**, **description summary**, **▶ View & Play** CTA |
| Card → detail | Thumbnail overlay link + title link to `/games/{slug}` |
| Detail hierarchy | Hero title+creator → **Play panel above fold** → description → share |
| Comments | Wrapped in **Community** section under rankings |
| Play routes | Unchanged — `playHrefForCatalogSlug`, MpWorldPlayLink, external iframe |
| Mobile | Reduced card min-heights, responsive padding/text sizes |

## NOT modified

- Game engines (Snake / Agar / Bomber)
- MP Death Sync, MobileControlPad, Invite/room sync
- Comments API / Game Registration API / Supabase schema

## typecheck

```
npm run typecheck  (apps/web) — PASS
```

## Preview smoke

| Check | Result |
| --- | --- |
| Preview deploy | FAIL — Vercel build/deploy failed before Visit URL available |
| Automated detail→play | Not run (no Preview URL) |
| PM manual (post-deploy) | `/games` → Snake/Agar/Bomber card → detail → Play CTA visible |

## 회귀 결과

| Area | Result |
| --- | --- |
| Local compile (Next bundler) | PASS after client-safe `game-discovery-ui` fix |
| Full `npm run build` | FAIL — prerender `/ranking`, `/community`: `column games.play_url does not exist` (pre-existing uncommitted Supabase migration gap, out of GAME-DEV-004 scope) |
| Gameplay / MP | Not touched |

## Known limitations

1. **Preview deploy blocked** — Vercel failure + optional `play_url` migration not applied locally.
2. **Creator card creator name** on `/games` grid shows generic `"Creator"` (client-safe); detail page resolves real name via server registry when slug is `creator-*`.
3. **Home catalog cards** still use `REPLAY_CARD_CTA`; only `GameCard` (discovery grid) uses `DISCOVERY_CARD_CTA`.
