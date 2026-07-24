# Sprint 15 — Developer RC1 Package

**Generated:** 2026-07-24 (Continuous Batch Sessions)  
**Branch:** `content-factory`  
**Developer scope:** **100%** · QA/Operator: pending OB-001

---

## Summary

| Area | Status | Artifact |
|------|--------|----------|
| Release Package 50/50 | ✅ | `docs/games/*-operation-guide.md` · `docs/reports/game-reviews/*` |
| Release Package audit | ✅ ~15/19 dev avg | `docs/reports/sprint15/release-packages/` |
| SEO (FAQ schema, tips, meta) | ✅ | `lib/seo/`, `game-tips-section.tsx` |
| Discovery UX | ✅ | `selectRecommended`, personalized picks, search |
| Analytics code validation | ✅ 50/50 | `analytics-matrix.md` |
| Build / Lint / Typecheck | ✅ | Session verify |
| Preview Product QA | ⏳ | OB-001 (Operator) |

---

## Release Package (50/50)

- **Operation guides:** `docs/games/{slug}-operation-guide.md` ×50
- **Review cards:** `docs/reports/game-reviews/{slug}-2026-07.md` ×50
- **Per-game audit JSON:** `docs/reports/sprint15/release-packages/{slug}.json`
- **Summary:** `docs/reports/sprint15/release-packages/_summary.json`

Regenerate: `npm run factory:sync-rc1`

---

## SEO

| Item | Implementation |
|------|----------------|
| Meta description | `buildGameMetadata()` — includes howToPlay snippet |
| Keywords | title, tags, `{title} 하는법` |
| Open Graph / Twitter | per-slug OG image route |
| JSON-LD VideoGame | `gameJsonLd()` |
| JSON-LD FAQ | `gameFaqJsonLd()` — how to play, difficulty, free |
| On-page tips | `GameTipsSection` on game detail |
| Nostalgia copy SQL | `0026_sprint15_nostalgia_notes.sql` (Operator) |

---

## Discovery UX

| Feature | Location |
|---------|----------|
| Similar games (tag+category score) | `selectRelated()` |
| 오늘의 추천 | `PersonalizedPicksSection` on home |
| 추천순 sort | `/games` discovery browser |
| Search slug/howToPlay | `searchGames()` |
| Recently played / favorites views | existing |

---

## Analytics Matrix

- **Code scan:** `npm run analytics:validate` → `analytics-matrix.md`
- **Result:** 50/50 PASS (SDK hooks in game source)
- **Operator SQL:** see `analytics-validation.md`

---

## QA / Operator (not Developer)

| Item | Owner |
|------|-------|
| Preview SSO OB-001 | Operator |
| Product QA Sessions 4–7 | Senior QA |
| Live analytics_events SQL | Operator |
| Migrations 0023–0026 apply | Operator |
| Production promote | DevOps + PM |

---

## Related Documents

- [`rc1-release-summary.md`](./rc1-release-summary.md) — NO GO until Preview QA
- [`qa-signoff.md`](./qa-signoff.md)
- [`game-certification.md`](./game-certification.md)
- [`../sprint16/sprint16-kickoff.md`](../sprint16/sprint16-kickoff.md)

---

## Senior Developer Sign-off

**Developer scope:** COMPLETE — HOLD for P0/P1 hotfix only.

**Next human gate:** Operator closes OB-001 → QA → RC1 GO.
