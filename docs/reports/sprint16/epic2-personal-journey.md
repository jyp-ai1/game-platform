# Sprint16 Epic2 — Personal Journey

**Status:** Complete (foundation)  
**Commit:** (see latest on content-factory)

---

## 구현

- **Play History Timeline** — 오늘 / 이번주 / 이번달 / 전체 필터
- **Journey Statistics** — 총 플레이, 총 시간(추정), 연속 플레이, Top 게임, 최근 게임
- **Guest Journey Profile** — `guestId` = device_id, `mergedAccountId` (Sprint17 merge 준비)
- **Session logging** — 게임 플레이 시 `play29:play-history` 기록
- Playwright bypass header — `VERCEL_AUTOMATION_BYPASS_SECRET` 지원

---

## 파일

| Area | Path |
|------|------|
| Journey identity | `apps/web/lib/journey-profile.ts` |
| Play history | `apps/web/lib/play-history.ts` |
| Timeline UI | `apps/web/components/play-history-timeline.tsx` |
| Stats UI | `apps/web/components/journey-stats-panel.tsx` |
| Journey hub | `apps/web/components/journey-hub.tsx` |
| E2E | `tests/e2e/sprint16-epic2.spec.ts` |

---

## QA

- Typecheck: PASS
- qa:quality: PASS (RC1 93%)

---

## 다음

Epic3 — Game Detail 2.0
