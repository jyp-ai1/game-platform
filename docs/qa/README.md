# QA Log (Release Gate)

Stage Gate별 QA 기록. GitHub Issue 대신 사용.

## 파일命名

```
docs/qa/YYYY-MM-DD-<stage>.md
```

예: `2026-07-26-stage1.md`, `2026-07-27-living-world.md`, `2026-07-28-playtest-01.md`

## 템플릿

각 문서는 동일 구조:

- **Build** — Git SHA
- **URL** — Deployment Visit URL only
- **PASS / FAIL** — 체크리스트
- **Fix Commit** — FAIL 시 수정 SHA

## Sprint 순서

1. Stage 1 — Golden Path
2. Stage 1-1 — Living World (30s idle)
3. Playtest #1
4. Production (4조건: Home · WORLD · Replay · Console clean)

Cursor 자동 push/deploy 금지. PM Create Deployment → Visit URL → QA → PASS 후 다음 Gate.
