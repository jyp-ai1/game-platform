# Golden Path E2E (Playwright)

자동 검증: Home → Quick Play → WORLD/Practice → Game Ready → Regression.

## 실행

```bash
npm run build
npm run test:e2e:golden-path
```

기존 서버 재사용:

```bash
# 터미널 1
npm run start --workspace=@game-platform/web -- -p 3021

# 터미널 2
QA_SKIP_SERVER=1 QA_BASE_URL=http://localhost:3021 npm run test:e2e:golden-path
```

Preview URL (배포 후):

```bash
QA_SKIP_SERVER=1 QA_BASE_URL=https://game29-xxxx.vercel.app npm run test:e2e:golden-path
```

## 커버리지

| 테스트 | 검증 |
|--------|------|
| Home LIVE Snake | 🔥 LIVE · 바로 참가 버튼 |
| Quick Play → ENTRY | CLICK → ROUTE → PROVIDER → ENGINE → CONNECT |
| Practice | `?room=PRACTICE` 즉시 플레이 |
| No room fallback | `/play` → `?room=PRACTICE` |
| WORLD join | WORLD 또는 Practice, Error Page 없음 |
| Regression | Home · Games · Community · Passport |

## Release Rule v2

배포 한도 시 **READY FOR DEPLOY** = 위 E2E local PASS + commit + push.  
Preview PASS는 Create Deployment 후 Visit URL에서 Release Report.
