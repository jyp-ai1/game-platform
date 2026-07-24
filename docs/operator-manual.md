# Operator Manual — Re:Play

**Production:** https://game29.vercel.app  
**Admin:** https://game29.vercel.app/admin  
**적용:** Sprint 12 GA 이후 · 운영자(사용자) 필독  
**목표:** **5분 안에** 서비스 운영 시작

---

## 1. 로그인

1. `/admin` 접속  
2. `ADMIN_SECRET` 입력 (Vercel 환경변수와 동일)  
3. 세션 유지 — 브라우저 닫기 전까지

---

## 2. CMS — 혼자서 할 수 있어야 함

**경로:** `/admin/cms`

| 작업 | 메뉴 | 절차 |
| --- | --- | --- |
| **배너 추가** | Banners | Create → 이미지 URL · 링크 · 기간 → Save |
| **공지 작성** | Notices | Create → 제목 · 본문 · 노출 기간 |
| **추천게임 변경** | Featured Games | 슬롯 선택 → slug 지정 → 순서 조정 |
| **Maintenance** | Visibility | slug → Maintenance → 저장 |
| **Hidden** | Visibility | slug → Hidden → 홈/카테고리 비노출 |
| **Event 등록** | Events | Launch template → NEW · XP 2× 문구 |

**Audit:** `/admin/cms/audit` — 누가 무엇을 변경했는지 확인

---

## 3. Analytics — 5초 안에 보기

**경로:** `/admin` (Dashboard) 또는 `/admin/analytics`

운영자가 **매일 아침** 확인:

| 지표 | 위치 |
| --- | --- |
| **오늘 DAU** | Admin Dashboard · DAU 카드 |
| **Top Game** | Top Game 카드 |
| **Mission** | Mission Rate 카드 |
| **Ranking** | Ranking Submit 카드 |
| **Play Time** | Play Time 카드 |
| **Retention** | Retention 카드 |

상세 drill-down: `/admin/analytics` · `/admin/monitoring`

Daily checklist: [`operator-daily-checklist.md`](./operator-daily-checklist.md)

---

## 4. 장애 — 1분 안에 알기

**경로:** `/admin/errors` · `/admin/monitoring` · `/admin/system`

| 확인 | 경로 | 기대 |
| --- | --- | --- |
| **API 오류** | `/admin/errors` | 오늘 0건 (P0 없음) |
| **DB 오류** | Errors · Monitoring RPC fail | 0건 |
| **게임 오류** | Errors filter `game_*` | slug별 확인 |
| **최근 Audit** | `/admin/cms/audit` | 의도치 않은 변경 없음 |
| **최 recent Deploy** | Vercel 대시보드 · `/admin/system` | Green |

**S1 대응:** [`incident-runbook.md`](./incident-runbook.md) · [`rollback-guide.md`](./rollback-guide.md)

---

## 5. Feature Flag — 개발자 없이

**경로:** `/admin/flags`

| 작업 | Flag / 방법 |
| --- | --- |
| **게임 숨기기** | CMS Visibility → Hidden **또는** `beta_games` OFF |
| **게임 오픈** | Visibility → Public · flag ON |
| **이벤트 종료** | CMS Events → end date 과거로 · Featured 해제 |
| **공지 종료** | CMS Notices → 비활성 · end date |

저장 후 홈 revalidate — 수 초 내 반영.

---

## 6. Players · Reports

| 작업 | 경로 |
| --- | --- |
| 유저 정지 | `/admin/players` → Suspend |
| CSV/Excel export | `/admin/reports` · `/admin/reports/export` |
| Print/PDF | `/admin/reports/print` |

---

## 7. SEO · System

| 작업 | 경로 |
| --- | --- |
| Meta 검증 | `/admin/seo` |
| Feature flags | `/admin/flags` |
| System health | `/admin/system` |

---

## 8. 게임별 운영

신규 게임 출시 시:

1. [`game-operation-guide.md`](./game-operation-guide.md) — slug별 가이드  
2. [`game-review-card.md`](./game-review-card.md) — D+7 Review  
3. [`templates/game-package-template.md`](./templates/game-package-template.md) — 19-item checklist

---

## 9. Operator Readiness Gate

운영자가 아래를 **실제 Production에서 1회 수행**하면 Operator Readiness **PASS** 후보:

- [ ] CMS: 배너 · 공지 · Featured · Maintenance · Hidden · Event  
- [ ] Analytics: 5초 내 DAU · Top Game · Mission · Ranking · Play Time · Retention  
- [ ] 장애: Errors · Audit · Deploy 상태 1분 내 확인  
- [ ] Feature Flag: 게임 숨김/복구 · 이벤트/공지 종료  

**Report:** `docs/reports/sprint-12/operator-readiness-report.md`

---

## Related

| Doc | Purpose |
| --- | --- |
| [`operator-daily-checklist.md`](./operator-daily-checklist.md) | 매일 5분 |
| [`pm-kpi-framework.md`](./pm-kpi-framework.md) | KPI 정의 |
| [`governance-v2-release-gate.md`](./governance-v2-release-gate.md) | Release Gate |
