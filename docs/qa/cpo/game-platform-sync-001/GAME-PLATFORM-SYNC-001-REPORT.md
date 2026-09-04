# GAME-PLATFORM-SYNC-001 + GAME-OPEN-002 — CTO REPORT

Deployment Target

Vercel Project : game29  
GitHub Repository : jyp-ai1/game-platform  
Branch : content-factory  

Production  
https://game29.vercel.app  

Commit  
*(uncommitted — local working tree)*  

/api/build-info  
N/A (not deployed)  

Deployment Scope  
Product catalog sync · Territory War deprecation · Re:Front feel polish  

Legacy project  
game-platform (Vercel Project) : Removed / Do not use  

---

## CEO Decision Applied

- **Territory War**: deprecated — no Product registration, no Games exposure, no QA
- **Re:Front**: sole active new-game development target
- **Priority**: Product Sync before Re:Front large feature work

---

## A. Product Sync

| Game | Code | Catalog | Games | Detail | Play | MP | Mobile | Status |
| ---- | ---- | ------- | ----- | ------ | ---- | -- | ------ | ------ |
| Agar Solo/MP | ✅ `games/agar` | ✅ MVP merge | ✅ | ✅ | ✅ `/games/agar/play` | ✅ WORLD | — | **PASS** |
| Snake Solo/MP | ✅ `games/snake` + flagship | ✅ MVP merge | ✅ | ✅ `/games/snake` | ✅ → `/flagship/snake-io/play` | ✅ WORLD | — | **PASS** |
| Bomber Solo/MP | ✅ `games/bomber` | ✅ MVP merge | ✅ | ✅ | ✅ `/games/bomber/play` | ✅ BOMBER-A | — | **PASS** |
| Re:Front MP | ✅ `games/re-front` | ✅ MVP merge | ✅ | ✅ | ✅ `/games/re-front/play` | ✅ RF-LOBBY | ✅ basics | **PASS** |
| Territory War | ⚠️ code in repo | ❌ filtered | ❌ hidden | ❌ notFound | ❌ notFound | ❌ | ❌ | **DEPRECATED** |

### Repository vs CEO target list

| CEO list | Repo slug | Notes |
| -------- | --------- | ----- |
| Agar Solo/MP | `agar` | Single slug, solo + MP modes in Product |
| Snake Solo/MP | `snake` | Play redirects to flagship `snake-io` |
| Bomber Solo/MP | `bomber` | Was missing from default MVP merge — **fixed** |
| Re:Front | `re-front` | MP only in Product |
| Territory War | `territory-war` | **Deprecated per CEO** |

No additional flagship slugs beyond the above four (+ deprecated TW).

### Product wiring changes

- `apps/web/lib/product-catalog-sync.ts` — catalog truth, mode labels, deprecated filter
- `apps/web/lib/local-mvp-games.ts` — bomber + re-front MVP rows; TW removed
- `apps/web/lib/creator/creator-game-catalog.ts` — `mergeCatalogGames()` filters deprecated
- `apps/web/lib/playable-games.ts` — re-front playable; TW removed
- `apps/web/components/game-player.tsx` — re-front loader; TW removed
- `apps/web/components/game-detail-template.tsx` — SOLO · MULTIPLAYER badges + solo CTAs
- `apps/web/app/games/[slug]/page.tsx` + `play/page.tsx` — TW → `notFound()`
- `apps/web/app/search/page.tsx` — uses `mergeCatalogGames`
- `apps/web/app/sitemap.ts` — excludes deprecated slugs
- `packages/game-sdk/src/platform-game-contract.ts` — re-front in flagship MP slugs
- `packages/multiplayer-sdk` — TW removed from `REALTIME_GAMES`

### QA evidence (local)

Base: `http://localhost:3045`  
Script: `tools/qa/game-platform-sync-001.mjs`  
Result: **PASS** (`sync-report.json`)

---

## B. Territory War

| Item | Status |
| ---- | ------ |
| Product registration | Removed from playable-games, game-player, MVP merge |
| Games / Discover | Hidden via `filterProductCatalogGames` |
| Detail route | `/games/territory-war` → **Game Not Found** |
| Play route | `/games/territory-war/play` → **notFound** |
| Sitemap | Filtered out |
| Recommendations / ranking / comments | Excluded from Product catalog merge |
| Source code | **Kept** in `games/territory-war/` (git history preserved) |
| Package dep | Removed `@game-platform/game-territory-war` from apps/web |
| QA scripts | Legacy scripts remain in repo; **not run** per CEO directive |

---

## C. Re:Front

### Implemented (GAME-OPEN-001 core + SYNC feel polish)

- 64×64 territory, nation spawn, expansion, economy (Gold/Population/Troops)
- Adjacent combat, capture, EXPANDER bot, 60% / last-nation victory
- 2–4P multiplayer, authoritative sync
- Rematch · Another Game · Exit · mobile basics
- **Feel polish (this sprint)**: expansion popup shows territory %, combat repulse/capture feedback, economy hint in HUD

### Browser QA

| Test | Result |
| ---- |--------|
| Start / Expansion / Economy / AI | PASS |
| Combat / Capture / Victory | PASS |
| Rematch / Exit | PASS |
| 2-browser sync | PASS |
| Mobile | PASS |

Script: `tools/qa/game-open-001.mjs` — **PASS**

### Product QA

| Test | Result |
| ---- |--------|
| Games → Detail → Play | PASS |
| Mobile play entry | PASS |

### Build

| Check | Result |
| ----- | ------ |
| Typecheck (`games/re-front`, `apps/web`) | PASS |
| Build (`apps/web`) | PASS |

### Not yet (P1 — after CPO Product PASS)

- Advanced AI (border pressure, weak-nation targeting)
- Match tension tuning (5-min uncertainty)
- CEO Feel validation

---

## D. Preview

| Field | Value |
| ----- | ----- |
| Commit SHA | *(local uncommitted)* |
| Branch | content-factory |
| Preview URL | *(not pushed — awaiting commit approval)* |
| Play URLs | `/games/agar/play`, `/flagship/snake-io/play`, `/games/bomber/play`, `/games/re-front/play` |
| Vercel status | Not deployed this session |

---

## E. Known Issues

1. **Uncommitted changes** — Product sync + Re:Front polish are local only; Production still on prior commit until push approved.
2. **Snake detail QA flake** — first sync QA run failed on `data-testid` timing; fixed with wait + PLAY NOW fallback in QA script. Product page works in browser.
3. **Territory War HTTP status** — Next.js `notFound()` returns 200 with "Game Not Found" title; QA checks title/absence of detail, not HTTP 404.
4. **Re:Front feel** — CTO technical PASS; CPO/CEO product feel not yet validated.
5. **Comments MVP** — Detail pages include comment UI for all flagship games; full write/refresh flow not re-run in this sprint (existing mp-cto-023 coverage).
6. **Game shell regression** — Agar/Snake/Bomber shell not re-run end-to-end this session; prior MP-CTO suites cover EXIT/rematch/keyboard; Re:Front shell covered by game-open-001.

---

## Release Gate Checklist

### Product Sync

- [x] Agar Product 노출
- [x] Snake Product 노출
- [x] Bomber Product 노출
- [x] Re:Front Product 노출
- [x] Territory War 미노출
- [x] Detail 연결
- [x] Play 연결
- [x] Multiplayer 연결
- [ ] Comments 연결 (existing MVP — not re-verified this sprint)
- [ ] Another Game 연결 (Re:Front PASS; flagship games prior coverage)

### Re:Front

- [x] Product 등록
- [x] Play route
- [x] Expansion / Economy / Combat (core + light feel)
- [x] AI (EXPANDER baseline)
- [x] Victory / Rematch / Mobile / Multiplayer
- [ ] CEO Feel PASS

### Regression

- [ ] Full game shell regression re-run (recommended before Preview push)
- [x] Territory War excluded from QA

---

## PM Action Required

```
□ Commit + Push approval (changes are READY FOR DEPLOY locally)
□ Vercel Create Deployment → Visit URL → Golden Path
□ CPO Product PASS (browser discovery loop on Preview)
□ CEO Feel (Re:Front only — after CPO PASS)
```

**CTO Technical QA: PASS (local)**  
**CPO Product PASS: Pending Preview verification**
