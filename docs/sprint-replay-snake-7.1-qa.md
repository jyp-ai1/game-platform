# Sprint 7.1 — QA & Stabilization Gate

> **Rule:** FAIL on any item → stop new feature work. Fix regressions first.  
> **Next sprint (8+) starts only when all items PASS on Preview.**

Preview URL: _(fill after deploy)_  
Tester: _  
Date: _

---

## Development Gate (mandatory)

1. Feature development for Sprint N+1 **only after** Sprint N QA is **all PASS**
2. One FAIL blocks the gate — no exceptions
3. Every fix gets a new Preview deploy + re-run of full checklist

---

## Checklist

### ① Camera

| # | Test | PASS | FAIL | Notes |
|---|------|------|------|-------|
| C1 | My snake stays near screen center while moving | ☐ | ☐ | |
| C2 | No sudden camera teleport during normal play | ☐ | ☐ | |
| C3 | Boost: smooth ~5% zoom out, returns on release | ☐ | ☐ | |
| C4 | No screen shake on eat / kill / death | ☐ | ☐ | |

### ② Zoom (1.4× base)

| # | Test | PASS | FAIL | Notes |
|---|------|------|------|-------|
| Z1 | Snake readable — not too far | ☐ | ☐ | |
| Z2 | View not too cramped / claustrophobic | ☐ | ☐ | |

### ③ Full Screen

| # | Test | PASS | FAIL | Notes |
|---|------|------|------|-------|
| F1 | PC: ⛶ Full Screen enters / exits | ☐ | ☐ | |
| F2 | Mobile: full screen or equivalent works | ☐ | ☐ | |

### ④ Retry

| # | Test | PASS | FAIL | Notes |
|---|------|------|------|-------|
| R1 | Die → Retry button visible | ☐ | ☐ | |
| R2 | Retry → snake respawns (alive, visible) | ☐ | ☐ | |
| R3 | Retry → **Spawn Ready** (no auto-move) | ☐ | ☐ | |
| R4 | Direction key → game starts | ☐ | ☐ | |
| R5 | Can die and retry again (repeat 3×) | ☐ | ☐ | |

### ⑤ Spawn (first join)

| # | Test | PASS | FAIL | Notes |
|---|------|------|------|-------|
| S1 | Join WORLD → snake exists (F2: snake YES) | ☐ | ☐ | |
| S2 | **YOU** label + white glow ~2s | ☐ | ☐ | |
| S3 | Frozen until direction input | ☐ | ☐ | |
| S4 | First input → **GO!** then movement | ☐ | ☐ | |
| S5 | Bots / other snakes visible on map | ☐ | ☐ | |

---

## Regression log

| Date | Item | Symptom | Fix commit |
|------|------|---------|------------|
| | | | |

---

## Sign-off

- [ ] All checklist items PASS
- [ ] Approved to start **Sprint 8 (Character)**
