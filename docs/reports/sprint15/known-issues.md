# RC1 Known Issues

**Updated:** 2026-07-24 (Session 8)  
**Status:** RC1 **NO GO** — Preview QA incomplete

---

## Operational Blockers

| ID | Severity | Issue | Owner | Release Impact |
|----|----------|-------|-------|----------------|
| OB-001 | **Blocker** | Vercel Preview Deployment Protection (SSO login wall) | Operator | Blocks Product QA, Lighthouse, RC1 sign-off |

---

## P0 — Open (Code)

**None.** All historical P0 items fixed. See [`bug-list.md`](./bug-list.md).

---

## P1 — Open (Code)

**None** (pre-Preview QA). Re-evaluate after Preview Sessions 4–7.

---

## P2 — Open (Post-RC1 / Sprint 16)

| ID | Area | Issue | Owner |
|----|------|-------|-------|
| P2-001 | Mobile | Touch/canvas per-game QA on real devices | QA |
| P2-002 | Analytics | Live `analytics_events` SQL validation | Operator |
| P2-003 | Game feel | Particles/shake polish | Sprint 16 |
| P2-010 | Difficulty | Tune Bottom10 from Closed Beta KPI | PM |
| P2-011 | Animation | Finish effects, score popup polish | Sprint 16 |
| P2-012 | Mobile UI | Spacing/touch targets from QA matrix | Sprint 16 |

---

## Environment Notes (Not bugs)

| Note | Detail |
|------|--------|
| Sitemap URL on dev | Uses `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` unset — verify on Preview/Production |
| `/leaderboard` | No standalone route; embedded in `/games/[slug]` |
| `/profile`, `/favorites`, `/search` | Not in sitemap (by design for user pages) |

---

## Escalation

| Class | Action |
|-------|--------|
| P0/P1 found on Preview QA | Developer hotfix only · update `bug-list.md` |
| OB-001 | Operator only · Developer **no action** |
