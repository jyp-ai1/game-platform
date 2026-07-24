#!/usr/bin/env node
/** Generates Sprint 13 operation guides + review card placeholders for 14 games. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const GAMES = [
  { slug: "stack-tower", title: "Stack Tower", category: "casual", difficulty: "EASY", playTime: "1~3분" },
  { slug: "ball-sort", title: "Ball Sort", category: "puzzle", difficulty: "EASY", playTime: "2~5분" },
  { slug: "color-sort", title: "Color Sort", category: "puzzle", difficulty: "EASY", playTime: "2~5분" },
  { slug: "penalty-shootout", title: "Penalty Shootout", category: "sports", difficulty: "EASY", playTime: "1~3분" },
  { slug: "darts", title: "Darts", category: "sports", difficulty: "EASY", playTime: "2~4분" },
  { slug: "bubble-shooter", title: "Bubble Shooter", category: "casual", difficulty: "EASY", playTime: "2~5분" },
  { slug: "merge-blocks", title: "Merge Blocks", category: "puzzle", difficulty: "EASY", playTime: "2~4분" },
  { slug: "connect4", title: "Connect 4", category: "board", difficulty: "EASY", playTime: "2~4분" },
  { slug: "reversi", title: "Reversi", category: "board", difficulty: "MEDIUM", playTime: "3~5분" },
  { slug: "gomoku", title: "Gomoku", category: "board", difficulty: "MEDIUM", playTime: "3~5분" },
  { slug: "bowling", title: "Bowling", category: "sports", difficulty: "EASY", playTime: "2~4분" },
  { slug: "archery", title: "Archery", category: "sports", difficulty: "EASY", playTime: "2~4분" },
  { slug: "sliding-puzzle", title: "Sliding Puzzle", category: "puzzle", difficulty: "MEDIUM", playTime: "3~8분" },
  { slug: "whack-a-mole", title: "Whack-a-Mole", category: "arcade", difficulty: "EASY", playTime: "0.5분" },
];

function opGuide(g) {
  return `# ${g.title} — Operation Guide

**Slug:** \`${g.slug}\`  
**Category:** ${g.category}  
**Released:** 2026-07-24  
**PM Owner:** ___________

---

## 1. 추천 대상

| 항목 | 내용 |
| --- | --- |
| 연령/취향 | 캐주얼 · ${g.category} 게임 선호 유저 |
| 플레이 시간 | ${g.playTime} |
| 난이도 | ${g.difficulty} |
| 모바일 적합 | Yes |
| PM 추천 | ★★★★☆ |

---

## 2. 운영 방법

- **NEW 배지:** \`released_at\` 기준 7일 (migration 0022)
- **Featured:** \`/admin/cms/featured\` → \`new_games\` 슬롯
- **Launch Event:** \`/admin/cms/events\` (0022 시드 또는 수동)
- **Visibility:** \`/admin/cms/visibility\` → visible

### 미션

- Daily: 카테고리(${g.category}) 플레이 미션 자동 연동
- Weekly: 주간 N판 미션 자동 연동

---

## 3. 점검 (운영자)

| Check | How | Expected |
| --- | --- | --- |
| Load | \`GET /games/${g.slug}\` | 200 |
| Play | 1판 완료 | 점수/결과 표시 |
| Save | 중간 저장 → 새로고침 | Resume (해당 게임) |
| Ranking | 게임 종료 후 | 랭킹 제출 |
| Analytics | \`/admin/analytics\` Sprint 13 KPI | Play +1 |
| Mobile | 375px | 터치 playable |

---

## 4. 비활성화

1. \`/admin/cms/visibility\` → Maintenance/Hidden
2. 또는 \`/admin/flags\` → \`beta_games\` OFF

---

## 5. 관련 문서

- Review Card: [\`../reports/game-reviews/${g.slug}-2026-07.md\`](../reports/game-reviews/${g.slug}-2026-07.md)
- Package: [\`../templates/game-package-template.md\`](../templates/game-package-template.md)
`;
}

function reviewCard(g) {
  return `# Game Review Card — ${g.title}

**Slug:** \`${g.slug}\`  
**Launch:** 2026-07-24  
**Review due:** D+7 (2026-07-31)  
**Status:** PLACEHOLDER — D+7 데이터 입력

---

## Summary

| 항목 | 값 |
| --- | --- |
| 난이도 | ${g.difficulty === "EASY" ? "★★★☆☆" : "★★★★☆"} |
| 평균 플레이 | TBD |
| PM 추천 | ★★★★☆ |
| Retry | TBD % |
| Favorite | TBD % |
| Finish Rate | TBD % |
| 7일 생존율 | TBD % |
| PM 평가 | **PENDING** |

---

## Analytics (from \`/admin/analytics\` → Sprint 13 KPI)

| KPI | D+0 | D+7 |
| --- | --- | --- |
| Play | | |
| Finish Rate | | |
| Ranking Submit | | |
| Favorite | | |
| Avg Score | | |

---

## Bugs

| Severity | Count | Notes |
| --- | --- | --- |
| P0 | 0 | |
| P1 | 0 | |
| P2 | 0 | |

---

## PM Sign-off (D+7)

- [ ] KPI 목표 충족
- [ ] P0/P1 = 0
- [ ] **PASS / HOLD**
`;
}

const opsDir = path.join(root, "docs", "games");
const reviewsDir = path.join(root, "docs", "reports", "game-reviews");
await mkdir(opsDir, { recursive: true });
await mkdir(reviewsDir, { recursive: true });

for (const g of GAMES) {
  const opPath = path.join(opsDir, `${g.slug}-operation-guide.md`);
  const revPath = path.join(reviewsDir, `${g.slug}-2026-07.md`);
  await writeFile(opPath, opGuide(g));
  await writeFile(revPath, reviewCard(g));
  console.log(`generated ${opPath}`);
  console.log(`generated ${revPath}`);
}
