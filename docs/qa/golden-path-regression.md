# Golden Path Regression — P0 Stabilization

## Baseline

| | |
|---|---|
| **Before** | `490b8ad` — GameSDKProvider fix, initial entry logs |
| **After** | _(this commit)_ — Release Rule v2, WORLD spawn fix, Community crash fix, Playwright Golden Path E2E |

## Changed files

| File | Change |
|------|--------|
| `apps/web/components/snake-io-play-client.tsx` | Provider log, error boundary → Practice, crash copy |
| `apps/web/app/flagship/snake-io/play/error.tsx` | **NEW** — route error → Practice |
| `apps/web/components/snake-multiplayer-entry.tsx` | JOIN fail → Practice |
| `games/snake/src/snake-entry-log.ts` | PROVIDER_READY, INPUT, GAME_START; always log |
| `games/snake/src/SnakeIo.tsx` | INPUT/GAME_START logs; empty room → Practice |
| `packages/multiplayer-sdk/src/client/entry-crash-log.ts` | `commit` field; export/copy/clear |
| `packages/multiplayer-sdk/src/client/global-world.ts` | crash persist on JOIN fail |
| `docs/qa/stage1-golden-path.md` | QA checklist |

## Reproduce

1. Visit URL @ target SHA
2. Home → **바로 참가**
3. DevTools Console — verify `[ENTRY]` chain
4. (Optional) Block network / force error — must land on `?room=PRACTICE`, no「문제가 발생했습니다」

## PASS conditions (DoD)

1. Home 정상
2. LIVE Snake 표시
3. 바로 참가 가능
4. Play Page 정상 (no global error.tsx)
5. Canvas 표시
6. 조작 가능
7. WORLD 연결 (or Practice if WORLD fails)
8. WORLD 실패 시 Practice 자동
9. Console Error 없음 (expected `[ENTRY]` info ok)
10. `EntryCrashLog.export()` works

## Known issues

_(fill after QA)_
