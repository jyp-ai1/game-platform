# RC1 Regression Matrix — Sprint 1 ~ 15

**Session:** 6 (2026-07-24)  
**Staging:** localhost:3010 + code audit · **Preview:** BLOCKED (OB-001)  
Fill **PASS / FAIL / BLOCKED / STAGING**

---

## Sprint 1–5 — Platform & Core Games

| # | Feature | Sprint | Staging | Preview | Impact | Notes |
|---|---------|--------|:-------:|:-------:|:------:|-------|
| R01 | Game launch (dynamic import) | 1–5 | PASS | pending | High | HTTP 200 ×50 |
| R02 | Score submit → Supabase RPC | 3 | STAGING | pending | High | Needs live Preview RPC test |
| R03 | Leaderboard display | 3 | STAGING | pending | High | UI present on game pages |
| R04 | Nickname + device_id identity | 3 | STAGING | pending | Medium | localStorage client-side |
| R05 | Game detail page + thumbnail | 2–5 | PASS | pending | Medium | All game pages 200 |
| R06 | Category browse | 1 | PASS | pending | Medium | `/categories/puzzle` 200 |
| R07 | Home game sections | 2–5 | PASS | pending | Medium | Home 200, cards in snapshot |
| R08 | Favorites toggle | 5 | STAGING | pending | Medium | aria-pressed buttons present |
| R09 | Recently played tracking | 5 | STAGING | pending | Medium | localStorage |
| R10 | Search box | 5 | PASS | pending | Low | `/search` 200 |

---

## Sprint 6 — Engagement

| # | Feature | Staging | Preview | Impact | Notes |
|---|---------|:-------:|:-------:|:------:|-------|
| R11 | XP gain on game finish | STAGING | pending | High | SDK wired all 50 |
| R12 | Level progress + header badge | STAGING | pending | Medium | hydration fix P1-002 |
| R13 | Level-up event | STAGING | pending | Medium | SDK |
| R14 | Play count tracking | STAGING | pending | Medium | SDK |
| R15 | Category play counts | STAGING | pending | Low | CMS + client |

---

## Sprint 7 — Daily Mission

| # | Feature | Staging | Preview | Impact | Notes |
|---|---------|:-------:|:-------:|:------:|-------|
| R16 | Daily mission card | STAGING | pending | Medium | Home component |
| R17 | Mission progress update | STAGING | pending | High | Play session required |
| R18 | Mission complete + XP reward | STAGING | pending | High | Preview test |
| R19 | Mission reset (new day) | STAGING | pending | Low | Date-bound |

---

## Sprint 8 — Player Hub

| # | Feature | Staging | Preview | Impact | Notes |
|---|---------|:-------:|:-------:|:------:|-------|
| R20 | Profile page | PASS | pending | High | `/profile` 200 |
| R21 | Player statistics grid | STAGING | pending | Medium | hydration fix P1-008 |
| R22 | Achievement gallery | STAGING | pending | Medium | Profile section |
| R23 | Continue Playing section | STAGING | pending | Medium | Home + P1-007 fix |
| R24 | Continue ≠ Resume (navigation only) | STAGING | pending | Medium | Design intent |
| R25 | Favorites section on home | STAGING | pending | Low | Home cards |
| R26 | Header XP badge | STAGING | pending | Medium | P1-002 fix |

---

## Sprint 9 — Save / Resume

| # | Feature | Staging | Preview | Impact | Notes |
|---|---------|:-------:|:-------:|:------:|-------|
| R27 | Save SDK (localStorage) | PASS | pending | High | Developer 50/50 cert |
| R28 | Auto-save during play | PASS | pending | High | SDK |
| R29 | Resume dialog on game start | STAGING | pending | High | Browser test Preview |
| R30 | Continue card → "이어하기" when save exists | STAGING | pending | Medium | |
| R31 | New Game clears state | STAGING | pending | Medium | |
| R32 | Save indicator UI | STAGING | pending | Low | |

---

## Sprint 10 — Season & Competitive

| # | Feature | Staging | Preview | Impact | Notes |
|---|---------|:-------:|:-------:|:------:|-------|
| R33 | Season XP + season card | STAGING | pending | Medium | P1-004 hydration fix |
| R34 | Weekly mission | STAGING | pending | Medium | |
| R35 | Player rank card (home) | STAGING | pending | Medium | Supabase RPC |
| R36 | Ready countdown (3-2-1-GO) | PASS | pending | Medium | 50/50 Developer |
| R37 | Unified game over overlay | PASS | pending | High | 50/50 Developer |

---

## Sprint 11 — Operations & SEO

| # | Feature | Staging | Preview | Impact | Notes |
|---|---------|:-------:|:-------:|:------:|-------|
| R38 | `/admin` dashboard | PASS | pending | Medium | HTTP 200 |
| R39 | Analytics events → DB | STAGING | pending | High | Preview + Supabase |
| R40 | SEO metadata + JSON-LD | PASS | pending | Medium | Code audit ✓ |
| R41 | Sitemap + robots | PASS | pending | Medium | localhost verify ✓ |
| R42 | CMS (banner, notice) | STAGING | pending | Medium | Live CMS Preview |
| R43 | Sound toggle | STAGING | pending | Low | P1-005 fix |

---

## Sprint 12–14 — Scale & Content

| # | Feature | Staging | Preview | Impact | Notes |
|---|---------|:-------:|:-------:|:------:|-------|
| R44 | 50 playable games wired | PASS | pending | High | playable-games.ts |
| R45 | CMS featured / weekly pick | STAGING | pending | Medium | |
| R46 | Game discovery (filter, sort) | PASS | pending | Low | `/games` 200 |
| R47 | Epic3/Epic4 games in CMS | PASS | pending | Low | migration ✓ |
| R48 | Content factory game packages | PASS | pending | Medium | Branch scope |

---

## Sprint 15 — RC1 Quality

| # | Feature | Staging | Preview | Impact | Notes |
|---|---------|:-------:|:-------:|:------:|-------|
| R49 | Hydration fixes | PASS | pending | High | Epic 1-B/C |
| R50 | Retry analytics | PASS | pending | Medium | emitGameRetry |
| R51 | 50/50 Save/Resume/Ranking | PASS | pending | High | Developer cert |
| R52 | ESLint / Typecheck / Build | **PASS** | **PASS** | High | Session 4/8 verified |

---

## Summary

| Metric | Staging | Preview |
|--------|---------|---------|
| Total items | 52 | 52 |
| PASS (verified) | 18 | — |
| STAGING (code/route, browser pending) | 34 | — |
| FAIL | 0 | — |
| BLOCKED | — | 52 (OB-001) |

**Regression official sign-off:** Preview required after OB-001 closed.

**Impact legend:** High = release blocker if broken · Medium = user-visible · Low = minor
