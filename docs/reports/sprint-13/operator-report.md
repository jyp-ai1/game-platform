# Sprint 13 — Operator Report

**Date:** 2026-07-24  
**Gate:** Operator (#4)

---

## Completed

| Task | Status |
| --- | --- |
| Apply 0020 / 0021 / 0022 SQL | ✅ |
| Verify 14 game pages live | ✅ |

---

## CMS Verification

| Check | Path | 5분 수정 | Status |
| --- | --- | --- | --- |
| Featured — 신규게임 (`new_games`) | `/admin/cms/featured` | ☐ | ☐ |
| Featured — 이번주 추천 (`weekly_pick`) | `/admin/cms/featured` | ☐ | ☐ |
| Launch Event × 14 | `/admin/cms/events` | ☐ | ☐ |
| Banner | `/admin/cms/banners` | ☐ | ☐ |
| Notice | `/admin/cms/notices` | ☐ | ☐ |
| Visibility | `/admin/cms/visibility` | ☐ | ☐ |
| Sprint 13 KPI | `/admin/analytics` | — | ☐ |

**5분 수정 기준:** 슬롯/배너/공지/이벤트를 Admin UI만으로 변경·저장·홈 반영 가능.

---

## Daily Ops Checks (Operator 5분 루틴)

| Item | Where | Check |
| --- | --- | --- |
| **오늘 Weekly Pick** | `/admin/cms/featured` → `weekly_pick` | ☐ 이번주 게임 1개 이상 active |
| **이번주 신규** | `/admin/cms/featured` → `new_games` | ☐ Sprint 13 batch 노출 |
| **NEW Badge** | `games.released_at` + 홈/게임 목록 | ☐ 7일 이내 신규 14개 배지 표시 |
| Launch Event active | `/admin/cms/events` | ☐ ends_at 유효 |
| Banner / Notice | CMS admin | ☐ 노출 중 항목 확인 |

---

## Sign-off

**Operator Result:** 🟡 IN PROGRESS — CMS + 5분 수정 검증 pending
