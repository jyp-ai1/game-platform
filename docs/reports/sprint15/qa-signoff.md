# Sprint 15 Epic1-A/B — QA Signoff & RC1 Readiness

**Updated:** 2026-07-24 (Epic 1-B complete — Developer scope)

---

## PM Gate matrix

| Gate | Status | Owner |
|------|--------|-------|
| Developer | **PASS** | ✓ Epic 1-B complete |
| Preview Deploy | **PASS** | `content-factory` @ pending push |
| Independent QA | **BLOCKED** | Preview SSO — Operator |
| Operator | **BLOCKED** | Migration 0023–0025 |
| Analytics (live SQL) | **HOLD** | Operator post-QA |
| PM RC1 | **HOLD** | After all PASS |
| main merge | **⛔ FORBIDDEN** | PM |
| Production Promote | **⛔ FORBIDDEN** | PM |

---

## Epic 1-B Developer completion

| Phase | Scope | Status |
|-------|-------|--------|
| Phase1 Hydration | Header, Season, Sound | **DONE** |
| Phase2 Release Package | 50-game code audit | **DONE** — 8/8 code |
| Phase3 Analytics code | SDK instrumentation | **DONE** — 50/50 |
| Phase4 Bug backlog | P0/P1/P2 classified | **DONE** |

---

## RC1 entry checklist

| # | Requirement | Developer | QA | Operator |
|---|-------------|-----------|-----|----------|
| 1 | 50 playable code | ✓ | — | — |
| 2 | Save/Resume/Ranking wiring | ✓ | — | — |
| 3 | Hydration warnings fixed | ✓ | verify | — |
| 4 | Preview accessible | — | blocked | unblock SSO |
| 5 | CMS games in DB | — | — | migrations |
| 6 | 50-game functional QA | — | pending | — |
| 7 | Console Error = 0 | — | pending | — |
| 8 | Analytics SQL PASS | — | — | pending |
| 9 | `release/sprint15-rc1` branch | — | — | after QA PASS |

---

## RC1 path (unchanged)

```
Developer PASS ✓
    ↓
Independent QA PASS (blocked: Preview SSO)
    ↓
Operator PASS (migrations + CMS)
    ↓
Analytics PASS (SQL)
    ↓
PM RC1 → release/sprint15-rc1
    ↓
main merge → Production → Closed Beta
```

---

## Operator actions (required before QA)

1. **Vercel game29** → Deployment Protection off or QA bypass token
2. **Supabase** → apply `0023`, `0024`, `0025`

QA URL: https://game29-git-content-factory-jyp-ai1s-projects.vercel.app

---

## Developer Epic 1-B verdict

**RC1-ready from code perspective.** QA can start immediately once Operator unblocks Preview + migrations.
