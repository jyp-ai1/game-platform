# Home Visual QA

Home UX Polish Sprint — visual and responsive verification before commit.

## Viewports

| Breakpoint | Size | Target |
|------------|------|--------|
| Mobile | 390×844 | iPhone 14 class |
| Tablet | 768×1024 | iPad portrait |
| Desktop | 1440×900 | Standard laptop |
| Desktop XL | 1920×1080 | Full HD |

## Checklist

### Hero (LIVE Snake)

- [ ] LIVE badge visible with subtle pulse
- [ ] Player count updates every ~5s (±1–2)
- [ ] Card hover: slight scale, thumbnail parallax
- [ ] CTA hover: subtle scale on primary/secondary buttons
- [ ] Friend row: `👤 이름 · N분 전 입장 · 현재 X점` when friend online

### Continue

- [ ] With history: title, score (1,420점), time (오늘 HH:MM), survival (생존 N분), [이어하기]
- [ ] Without history: empty CTA — not a blank box

### Recommendations

- [ ] Unified badges: Easy / Normal / Hard, HOT, NEW

### Loading

- [ ] Skeleton ~0.5s on first paint, no layout jump

### Console

- [ ] Zero console errors on home load

## Automated

```bash
npm run build
npm run typecheck
npm run lint
npm run test:e2e:golden-path
npm run test:e2e:home-visual
```

## Commit gate

| Gate | Required |
|------|----------|
| Build | PASS |
| Typecheck | PASS |
| Lint | PASS |
| Golden Path E2E | PASS |
| Visual QA | PASS |
| Responsive QA | PASS |
| Console Error | 0 |
| Empty State | PASS |
| Loading Skeleton | PASS |
