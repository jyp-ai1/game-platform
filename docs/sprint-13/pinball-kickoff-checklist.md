# Sprint 13 — Pinball Kickoff Checklist (Design Only)

**Status:** ⏸️ **DO NOT IMPLEMENT** until PM GA + Soft Launch Data Review PASS  
**Branch (when authorized):** `sprint-13/pinball-release`

---

## Kickoff Blockers

```
Developer PASS → QA PASS → DevOps PASS → Operator PASS
→ Soft Launch (3~7일) → Data Review → PM GA → Pinball only
```

---

## Branch Structure (prepare only)

```bash
# After PM GA only:
git checkout -b sprint-13/pinball-release main
# Pinball Game Package — one game, one cycle
```

**Forbidden:** Connect4 · Water Sort · Mahjong in same branch/sprint batch

---

## Pinball Game Package (final list)

```
게임 구현 · SEO · OG Image · Mission · Achievement · XP · Season
Ranking · Category · Thumbnail · CMS 등록 · Analytics · Review Card
Operation Guide · Save · Resume · Mobile · QA · Production
```

Template: [`../templates/game-package-template.md`](../templates/game-package-template.md)

---

## Pinball Cycle (PM)

```
Pinball Release → Soft Launch → Data Review → Pinball 개선 → Connect4
```

Spec: [`specs/pinball.md`](./specs/pinball.md)

---

## Pre-Implementation Checklist

- [ ] `soft-launch-summary.md` complete
- [ ] PM GA (`v1.12.0`)
- [ ] PM Pinball kickoff sign-off
- [ ] Branch `sprint-13/pinball-release` created
- [ ] **Then** implementation starts

**Until then: zero Pinball code.**
