# RC1 Accessibility Checklist — Phase E

**Session:** 3 (2026-07-24)  
Target: Lighthouse Accessibility **100** on Preview

---

## Pages

- [ ] `/` Home
- [ ] `/games`
- [ ] `/games/2048` (representative game)
- [ ] `/profile`
- [ ] `/favorites`
- [ ] `/search`

---

## Keyboard

| Check | Home | Games | Game | Profile | Favorites | Search |
|-------|:----:|:-----:|:----:|:-------:|:---------:|:------:|
| Tab forward | | | | | | |
| Shift+Tab backward | | | | | | |
| Enter activates control | | | | | | |
| Space toggles button | | | | | | |
| ESC closes dialog/modal | | | | | | |
| Game keyboard input (2048) | | | | | | |

---

## Focus

| Check | Result |
|-------|--------|
| Focus visible on all interactive elements | |
| Logical tab order (header → main → footer) | |
| No focus trap (except intentional modals) | |
| Resume dialog focus management | |
| Search overlay focus | |

---

## ARIA

| Check | Result |
|-------|--------|
| Buttons have accessible name | |
| Progress bars have `label` | |
| Favorite toggle `aria-pressed` | |
| Dialog role + label (Resume) | |
| Live regions (toast) | |
| Skip link (if present) | |

---

## Visual

| Check | Result |
|-------|--------|
| Color contrast WCAG AA | |
| Text readable at 375px | |
| Reduced motion respected | |
| Dark mode (default) consistent | |

---

## Lighthouse Accessibility

| Page | Score | Target |
|------|------:|--------|
| Home | | 100 |
| Profile | | 100 |
| Game (2048) | | 100 |

**Status:** Checklist ready · Execution pending Preview
