# Sprint 8.1 + 8.2 QA — Growth Feel & Body Color

**Preview gate:** QA PASS before Sprint 9 (Progression).

## Sprint 8.1 — Growth Feel

| # | Check | PASS |
|---|-------|------|
| 1 | Food 2개당 길이 +1 유지 | ☐ |
| 2 | Food 먹을 때마다 몸이 점점 굵어짐 (max ~140%) | ☐ |
| 3 | Eat pop: 1.0 → 1.08 → 1.0 (~150ms), 전체 몸 | ☐ |
| 4 | 맵 Food 밀도 ~2배 (이전 대비 풍성) | ☐ |
| 5 | Food tier: Small 55% / Medium 25% / Large 15% / Epic 5% | ☐ |
| 6 | Retry 후 bodyRadiusScale 리셋 (1.0) | ☐ |

## Sprint 8.2 — Body Color

| # | Check | PASS |
|---|-------|------|
| 7 | 캐릭터 선택 → Body Color 자동 적용 | ☐ |
| 8 | 🐼 Panda: 흰/검 교차 세그먼트 | ☐ |
| 9 | 봇도 headCharacter별 Body Color | ☐ |
| 10 | Retry/재스폰 후 색상 유지 | ☐ |

## Regression (7.x)

| # | Check | PASS |
|---|-------|------|
| 11 | Spawn-ready pause, 첫 입력 전 정지 | ☐ |
| 12 | Camera jitter 없음 (boost 시) | ☐ |
| 13 | Retry → 즉시 재참여 | ☐ |
| 14 | Fullscreen 정상 | ☐ |

## Release tag

`v0.8.1` — Gameplay Feel  
`v0.8.2` — Character Body Color (same deploy if bundled)
