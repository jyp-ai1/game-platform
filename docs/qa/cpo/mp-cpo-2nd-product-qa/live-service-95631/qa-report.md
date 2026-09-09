# WO 95631 — Re:Play Live Service Foundation

```text
QUEUED — DO NOT EXECUTE UNTIL PREDECESSORS COMPLETE
선행: WO 84216 CPO Product PASS → CLOSE
구현 없음 · Preview 없음 · Production 작업 없음
선행 Gate: WO 84216 CPO Product PASS → CLOSE
Baseline 예정: game29 a0ce9b1
Vercel: game29
Repo: jyp-ai1/game-platform
```

**Now: QUEUED.** Do not execute.

[CTO LONG-RUN RULE] 검토 요청·범위 확인·다음 작업 질문은 중간 보고이며 금지. 실행 시 끝까지 수행 후 결과 1회.

## Armed — fire only after 84216 CLOSE

```text
EXECUTE NOW / DO NOT ASK FOR NEXT TASK

WO 95631 = 약 3시간+ Long Sprint.
범위를 쪼개어 중간 확인받지 말 것.
기존 evidence → Production baseline → Player Session Foundation 전체.
구현 → 통합 → Local QA → Full Browser E2E → 수정 → Regression
→ Preview → Preview E2E → Production → Production E2E → Evidence → CTO Final QA
한 사이클로 끝낸다. PASS 영역 재구현 금지. 영향분만 검증.
Snake / Agar / Bomber / Re:Front 필요 범위 연결.
Refresh / Back / Double-click / stale room / join failure / reconnect / cleanup
/ Rematch / Another Game / Exit 검증.
NO Solo / PRACTICE / fallback=1 / BOMBER-SOLO / silent Solo / infinite Connecting
/ Exit→Home / Another→Discover / Bomber Map Select / STEP4.
중간 보고 금지. 다음 작업 요청 금지.
최종 보고 1회: SHA · deploy · impl · Local · Preview E2E · Production E2E
· 4-game · Desktop · Mobile · edge · evidence path · CTO Final QA · known issues
그 후 CPO Product QA 요청.
```

10742 / 12853 use the same 3H protocol when their predecessors CLOSE.

## Official path (when OPEN)

```text
docs/qa/cpo/mp-cpo-2nd-product-qa/live-service-95631/
├── qa-report.md
├── final-close.json
└── evidence/
```

## Scope (after OPEN only)

Player Session · Progression 최소 기반 · Character/Color 확장 지점 · Result Replay Hub · Catalog/Detail · 4게임 루프  
NO Solo / PRACTICE / fallback / BOMBER-SOLO / Exit→Home / Another→Discover / Map Select / STEP4

## Current gates

```text
WO 84216
🟡 OPEN · CPO Product QA pending

Production
game29 / a0ce9b1

WO 95631
⏸ QUEUED
구현 없음
```
