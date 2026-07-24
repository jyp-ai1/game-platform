# Operator Matrix — RC1 (Post-Developer GO)

**Updated:** 2026-07-25  
**Developer RC1:** **GO** (OB-001 waived per PM — staging QA accepted)  
**Branch:** `content-factory` @ `e1b9cc1`

---

## Operator Checklist

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| O1 | Preview SSO (OB-001) | Operator | ⏳ Optional fast-follow | Waived for RC1 Candidate gate |
| O2 | Apply migration 0023 | Operator | ⏳ | chess, checkers, jigsaw |
| O3 | Apply migration 0024 | Operator | ⏳ | mancala, mini-golf, billiards |
| O4 | Apply migration 0025 | Operator | ⏳ | Epic4 batch (9 games) |
| O5 | Apply migration 0026 | Operator | ⏳ | nostalgia notes all 50 |
| O5b | Apply migration 0027 | Operator | ⏳ | balance metadata + KPI retries/avg time |
| O6 | `NEXT_PUBLIC_SITE_URL` on Preview | Operator | ⏳ | sitemap/robots canonical |
| O7 | Live analytics SQL | Operator | ⏳ | `analytics-matrix.md` templates |
| O8 | CMS featured/events verify | Operator | ⏳ | `/admin/cms/*` |
| O9 | Production promote | DevOps + PM | ⏳ | After PM final sign-off |

---

## SQL Apply Order

```
0023_sprint14_epic3_batch1.sql
0024_sprint14_epic3_batch2.sql
0025_sprint14_epic4_batch.sql
0026_sprint15_nostalgia_notes.sql
0027_sprint15_balance_metadata.sql
```

---

## Verification (Operator)

| Check | Command / URL |
|-------|---------------|
| Game pages | `/games/chess`, `/games/basketball` → 200 |
| Nostalgia sidebar | Any game detail → 추억 이야기 |
| Analytics events | SQL in `analytics-validation.md` |
| Preview smoke | Home + 2048 + profile (when SSO open) |

---

## PM Gate

Developer + Staging QA = **PASS**. Operator items above are **parallel fast-follow**, not blocking Developer RC1 Candidate per PM directive (2026-07-25).
