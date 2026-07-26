# Stage 1 — Golden Path QA

> **Target:** Home → Quick Play → WORLD → 플레이 → 죽음 → Replay  
> **Build:** _(Git SHA)_  
> **Visit URL:** _(Deployment only — not game29.vercel.app)_

## Checklist

- [ ] Home — 페이지 정상 로드 (2초 이내)
- [ ] LIVE Snake — `🔥 LIVE Snake.io` 표시
- [ ] 바로 참가 — 버튼 클릭 즉시 이동
- [ ] WORLD — `?room=WORLD` Canvas 출현 (3초 이내)
- [ ] Spawn — 내 뱀 생성
- [ ] Movement — 방향키/WASD 조작
- [ ] Death — 죽음 처리
- [ ] Replay — 리매치 / 다시 플레이
- [ ] Home 복귀 — (Stage 1 scope 외 — 기록만)
- [ ] Console Error 없음

## Console [ENTRY] chain (순서)

```
[ENTRY] CLICK
[ENTRY] ROUTE
[ENTRY] PLAY_MOUNTED
[ENTRY] PROVIDER_READY
[ENTRY] ENGINE_READY
[ENTRY] CONNECTING
[ENTRY] CONNECTED
[ENTRY] JOINED
[ENTRY] SPAWNED
[ENTRY] CANVAS_READY
[ENTRY] GAME_READY
[ENTRY] INPUT          (첫 조작 시)
[ENTRY] GAME_START     (선택)
```

FAIL 시: `[ENTRY][FAIL] step: … reason: …`

## Fallback 확인

- [ ] WORLD 실패 → `?room=PRACTICE` 자동 전환 (Error Page 없음)
- [ ] 8초 timeout → Practice
- [ ] Render error → Practice

## Crash Log

Play 페이지 **「최근 오류 복사」** 또는 콘솔:

```js
EntryCrashLog.export()
EntryCrashLog.clear()
```

## Result

| Gate | PASS / FAIL |
|------|-------------|
| Stage 1 Golden Path | |

## Fix Commit

_(FAIL 시)_

## Notes

_(스크린샷 · 영상 · Known Issue)_
