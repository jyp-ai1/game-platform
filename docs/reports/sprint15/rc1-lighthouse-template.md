# RC1 Lighthouse Template — Phase F / G

**Session:** 3 (2026-07-24)  
Run on **Preview/Production** (not local dev). Mobile emulation recommended.

---

## Targets

| Metric | Target |
|--------|--------|
| Performance | ≥ 90 (PM: ≥85 minimum, 90+ goal) |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

---

## Pages to measure

| Page | URL | Perf | A11y | BP | SEO | LCP | CLS | INP | Date | Tester |
|------|-----|-----:|-----:|---:|----:|-----:|----:|----:|------|--------|
| Home | `/` | | | | | | | | | |
| Games list | `/games` | | | | | | | | | |
| Profile | `/profile` | | | | | | | | | |
| Game | `/games/2048` | | | | | | | | | |
| Admin | `/admin` | | | | | | | | | optional |

---

## Baseline reference (Production game29, 2026-07-24 local files)

| Page | Perf | LCP | CLS |
|------|-----:|-----:|----:|
| Home (prod snapshot) | 81 | 2.9s | 0 |
| 2048 (prod snapshot) | 63 | 2.9s | 0.01 |

> Re-measure on Preview after OB-001. Production baseline is reference only.

---

## Regression rule

- [ ] No page drops >10 Performance points vs baseline
- [ ] Accessibility remains 100
- [ ] No new console errors during Lighthouse run

**Status:** Template ready · Execution pending Preview
