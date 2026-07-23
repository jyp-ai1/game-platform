# Re:Play Sprint 10 — Season & Competitive Loop

> ⚠️ **참고용 계획 문서입니다 — 실행용 아님.** 이 파일은 구현 전 승인받은 설계 초안이며, 특히
> Epic 3의 `get_my_rank` SQL 스니펫은 미랭킹 기기에 대해 `null` 대신 거짓 "1등"을 반환하는
> 버그가 있던 초안입니다. 실제로 커밋되어 실행해야 할 최종 SQL은
> `supabase/migrations/0009_sprint10.sql`이며, 그 파일의 함수는 서브쿼리 조인 방식으로 이
> 버그를 고친 버전입니다. 전체 배경은 `HANDOFF.md`를 참고하세요.

## Context
Sprint 9 shipped Save/Resume across all 8 games. The PM's review (9.6/10) approved the
architecture but flagged that the platform still lacks a reason for players to *come back* —
Season, Weekly Mission, Leaderboard, and Daily Reward are the "return loop" this sprint builds.
The PM also asked for two Sprint-9 follow-ups (a real save migration test, a friendlier save
timestamp) and scoped Epic 6 to 2-3 new games, favoring platform features over game count.

**Scope resolved with the PM before planning (3 clarifying questions, all recommended options
chosen):**
- **Epic 6 game list**: only **SameGame** is genuinely new. **Simon already shipped in Sprint 5**
  (`games/simon`) — dropped. **Arkanoid DX** overlaps almost completely with Sprint 9's Breakout
  (paddle + brick-breaking) — kept as its own package but redesigned with real differentiators
  (power-ups, multi-stage progression) rather than shipped as a near-duplicate.
- **"카테고리별 랭킹" (category ranking)**: scores are per-game with incomparable scales (2048's
  thousands vs. Tic-Tac-Toe's win count) — no schema change. Ships as a UI that groups a
  category's games and lets you tab between their existing per-game leaderboards, not a new
  cross-game aggregate.
- **"Home → Tab" concern**: the PM raised this as commentary, not as one of the 6 numbered epics
  (only Epic 5 — new cards — is explicit). This sprint adds the 3 new cards only; a full homepage
  IA rework to tabs is deferred to its own future sprint.

## Architecture reuse (confirmed via code reading, not assumption)
- **XP is a single lifetime pool today** (`xpCache` in `engagement.ts`) — no existing separation
  a "Season XP" track could reuse; it needs its own parallel cache + its own hook-point recorders,
  mirroring `engagement.ts` exactly.
- **The 3 universal hook points** are called from exactly 2 files: `recently-played-recorder.tsx`
  (session-start) and `packages/game-sdk/src/context.tsx` (score-report + ranking-submitted, both
  inside `reportScore`/`handleSubmit`). Every new system (missions, and now season/weekly-mission)
  adds its own `record*` call alongside the existing ones at these exact 2 files — this is the
  established, repeated pattern, not a new idea.
- **`missions.ts`'s XP-ownership inversion is the model to copy exactly**: a mission/season system
  never calls an XP function directly — it emits an event via `emitEngagementEvent`, and whichever
  systems care (today: `engagement.ts`; this sprint: also `season.ts`) subscribe to react
  independently. `missions.ts`'s `mulberry32`/`pickThree` (deterministic seeded shuffle, currently
  private) will be exported for `weekly-missions.ts` to reuse verbatim — only the seed input
  changes (date string → ISO week string).
- **`get_leaderboard(p_game_slug, p_since, p_limit)`** (in `0003_sprint3.sql`) already accepts an
  arbitrary cutoff timestamp — adding a "weekly" tab needs zero schema/RPC change, just a new
  client-side `startOfWeekIso()` helper alongside the existing `startOfTodayIso()` in
  `apps/web/lib/supabase/scores.ts`. Personal-rank display, however, has no existing RPC — needs
  one new function.
- **`toast-item.tsx`'s `toastContent()` switch** and **`EngagementEvent` union** are the
  established extension points for any new "something happened" notification (daily reward, weekly
  mission complete) — add a case, don't build a parallel notification system.

## Epic 1 — Season System (P0)

**New `packages/game-sdk/src/season.ts`**, structurally mirroring `engagement.ts`'s XP/level
machinery but as an independent parallel track:
```ts
export const CURRENT_SEASON = { id: "season-1", label: "Season 1" }; // no rotation logic yet
```
- Storage keyed by season id (`play29:season-xp:${CURRENT_SEASON.id}`) — this *is* the "reset
  structure ready, reset not implemented" the PM asked for: introducing `season-2` in a future
  sprint naturally starts that player at 0 with zero migration code, since it's a fresh key.
- Reuses `xpForLevel`/`levelForXp` from `engagement.ts` directly (same formula, already exported)
  — no reason to reinvent leveling math for a second track.
- `recordSeasonSessionStart`/`recordSeasonScoreReport`/`recordSeasonRankingSubmitted` — same
  signatures as their `engagement.ts` counterparts, awarding the same XP constants
  (`PLAY_XP`/`SCORE_REPORT_XP`/etc., imported not redefined). Called alongside the existing
  `record*`/`recordMission*` calls at the same 2 files (`recently-played-recorder.tsx`,
  `context.tsx`).
- Subscribes to `subscribeEngagementEvents` for `"mission-completed"` (and this sprint's new
  `"weekly-mission-completed"`) the same way `engagement.ts` does, so mission-driven XP also grows
  the season track — one XP pipeline, two independent totals reading from it.
- **Season Badge**: purely derived, no separate unlock-state persistence — `SEASON_BADGE_TIERS =
  [{level:5,name:"Bronze"},{level:10,name:"Silver"},{level:20,name:"Gold"}]`,
  `getSeasonBadge(level)` returns the highest tier reached.
- **Season Progress UI**: `apps/web/components/season-card.tsx` for the homepage (Epic 5),
  reusing `<Progress>` exactly like `header-level-badge.tsx` does today, so it reads as "the same
  kind of bar, a different number" rather than a visually competing new widget.

## Epic 2 — Weekly Mission (P0)

**New `packages/game-sdk/src/weekly-missions.ts`** — deliberately a close copy of `missions.ts`'s
shape, not a reinvention:
- Export `mulberry32` and `pickThree` from `missions.ts` (currently private) for direct reuse here.
- `seedFromWeek(weekStr)` (new, parallel to `missions.ts`'s private `seedFromDate`) +
  `isoWeekString(date)` (new pure helper, e.g. `"2026-W04"`).
- **Single weekly mission, not three** — the PM's ask ("누적 플레이 기반 목표") is one cumulative
  target for the week, not a daily-style set. Reuses the *existing* `anyPlayMission`/
  `categoryPlayMission`/`playCountMission` factories from `missions.ts` (exported for this reuse)
  with week-appropriate targets (e.g. 20-40 plays vs. daily's 1-3), tier-scaled via the existing
  `getMissionTierForLevel`.
- `ensureFreshWeeklyMissionState()` mirrors `ensureFreshMissionState()`'s lazy-fill-on-rollover
  pattern exactly, checking the cached state's week string instead of date string.
- On completion: emits a new `{type: "weekly-mission-completed", missionId, title, xp}` event
  (extends the `EngagementEvent` union in `engagement-events.ts`) — `engagement.ts` and
  `season.ts` both subscribe and award XP independently, same inversion as daily missions.
  "주간 보상(배지)" is scoped as a visual completion checkmark in the card UI, not a new persisted
  badge-collection system (that would overlap with the existing Achievement system's scope).
- `recordWeeklyMissionSessionStart`/`recordWeeklyMissionScoreReport` — called alongside the
  existing daily-mission calls at the same 2 hook-point files.
- **New `apps/web/components/weekly-mission-card.tsx`** for the homepage (Epic 5), structurally a
  near-copy of `daily-challenge-card.tsx` (same `useSyncExternalStore` + event-subscription
  pattern) but rendering the single weekly mission instead of 3 daily ones.

## Epic 3 — Leaderboard Expansion (P0)

- **`apps/web/lib/supabase/scores.ts`**: extend `LeaderboardPeriod` to `"today" | "weekly" |
  "all"`; add `startOfWeekIso()` (Monday-start, mirroring the existing `startOfTodayIso()`); pass
  it as `p_since` when period is `"weekly"` — the RPC itself needs no change.
- **`apps/web/components/leaderboard.tsx`**: add the "Weekly" tab to the existing
  `("today"|"all")` tab array; while touching this component, also fix the pre-existing WCAG
  color-contrast failure flagged in Sprint 9's report (`text-muted-foreground` tab-button text on
  `bg-muted`, 4.03:1 vs required 4.5:1) — small, contained, and directly adjacent to code already
  being touched this sprint.
- **Personal rank** — new Supabase RPC (migration `0009_sprint10.sql`):
  ```sql
  create or replace function public.get_my_rank(p_game_slug text, p_device_id text, p_since timestamptz default null)
  returns integer language sql stable as $$
    select count(*) + 1 from public.scores
    where game_slug = p_game_slug
      and (p_since is null or updated_at >= p_since)
      and score > (select score from public.scores where game_slug = p_game_slug and device_id = p_device_id)
  $$;
  ```
  Returns `null` implicitly (via the inner subquery) if this device has no score yet — the client
  treats that as "unranked." New `getMyRank(gameSlug, period)` in `scores.ts`, surfaced in
  `Leaderboard` as a "내 순위: #N" line and in the new Player Rank card (Epic 5).
- **Category ranking UI** — new `apps/web/components/category-leaderboard.tsx` (or a tab within
  the existing category page): lists the category's games, each with a mini "top 3 + your rank"
  pulled from the *existing* `getLeaderboard`/`getMyRank`, no aggregation across games.
- **"Top100 API 구조"**: already satisfied — `get_leaderboard`'s `p_limit` already defaults to
  100. No change needed; noted as already-done in the final report rather than built twice.

## Epic 4 — Daily Reward (P1)

**New `packages/game-sdk/src/daily-reward.ts`**, reusing `DailyStreakState`/`updateDailyStreak()`
already in `engagement.ts` rather than tracking a second streak:
- `hasClaimedTodayReward()` / `claimDailyReward()` — localStorage-keyed by today's date string
  (same `todayLocalDateString()` pattern used throughout this package).
- Reward scales with `dailyStreakCache.currentStreak`: flat XP days 1-6, a larger bonus + a
  distinct toast on day 7 ("7일 연속 보너스"), matching the PM's ask.
- Auto-claims on the first `recordSessionStart` of the day (no extra click) and emits a new
  `{type: "daily-reward-claimed", xp, streakDay}` event → **one new `case` added to
  `toast-item.tsx`'s existing `toastContent()` switch** (the "첫 접속 토스트" ask is just this,
  not a new notification system).

## Epic 5 — Competitive UI (P1)

- `season-card.tsx`, `weekly-mission-card.tsx` (built above) + new `player-rank-card.tsx` (shows
  this device's rank in 1-2 of its most-played games via `getMyRank`) — all inserted into
  `apps/web/app/page.tsx` near the existing `DailyChallengeCard` position.
- **Continue Playing enhancement**: `continue-playing-card.tsx` already has the `Game` prop; add
  the platform-wide level (`getLevel()`, already exported) and this specific game's best score
  (`getBestScore(game.slug)`, already exported) next to the existing relative-time text — both are
  already-available getters, no new state needed. Mission-tag ("이 게임 관련 미션 진행중") is
  scoped as a stretch addition only if time permits after the above, since it requires
  cross-referencing `getDailyMission()`'s active mission `linkHref` against this card's game slug.

## Epic 6 — New Games (P2, capped at 2)

- **SameGame** (`games/samegame/`) — click a group of ≥2 adjacent same-color tiles to clear them;
  score scales with group size; game ends when no clearable group remains. Turn-based (no rAF/
  ticking), closer to Memory/Minesweeper's click-driven shape than Breakout's physics shape. Save
  SDK wired in from the start (`useResumableGame`/`useAutoSave`/`ResumeDialog`/`SaveIndicator`),
  same as every Sprint 9 game.
- **Arkanoid DX** (`games/arkanoid-dx/`) — starts from Breakout's engine shape (paddle + ball +
  bricks) but is NOT a copy: adds multi-stage progression (2-3 brick layouts cleared in sequence)
  and 2 power-ups (paddle-widen, multi-ball) that drop from specific bricks, giving it a
  genuinely different moment-to-moment feel from vanilla Breakout rather than a reskin.
- Both registered the same way every prior game has been (per the standing checklist):
  `playable-games.ts`, `game-player.tsx`, `apps/web/package.json` dependencies, thumbnail via
  `scripts/generate-thumbnails.mjs`, Supabase migration insert (same migration file as Epic 3's
  RPC, `0009_sprint10.sql`).

## Sprint 9 follow-ups (explicitly demanded by the PM, not in the 6 epics but non-negotiable)

- **Real save migration test**: bump `SAVE_VERSION` to `2` in `save.ts`. The actual v1→v2 change:
  add an `deviceId` field to the save envelope (not the per-game state) — genuinely useful (Cloud
  Save readiness for Sprint 11), not a placeholder change. Implement the `MIGRATIONS[1]` entry for
  real, and verify it end-to-end with a scratchpad script that (a) writes a raw v1-shaped envelope
  directly to localStorage, (b) calls `loadGame()`, (c) asserts the returned envelope is v2-shaped
  with `deviceId` populated. This repo has no test runner (no jest/vitest configured anywhere), so
  this is a one-off verification script run during QA, not a permanent automated test — noted
  explicitly in the final report so it doesn't read as a silently-skipped ask.
- **Save Indicator "n초 전"**: after the existing "Saving..." → "Saved" (0.8s) flash, instead of
  reverting to hidden/idle, show a persistent small "저장됨 · n초 전" using the envelope's
  `updatedAt` (need a new `getSaveUpdatedAt(slug)` export from `save.ts`), ticking via a 1s
  interval only while visible.

## Execution order (T0–T12)

1. **T0 — Season SDK.** `season.ts` (XP/level/badge, event subscription). Gate: typecheck.
2. **T1 — Season hook wiring.** Add `recordSeason*` calls to `recently-played-recorder.tsx` +
   `context.tsx`. Gate: XP accrues on play/score/ranking, verified via localStorage inspection.
3. **T2 — Weekly Mission SDK.** Export `mulberry32`/`pickThree`/mission factories from
   `missions.ts`; new `weekly-missions.ts`; extend `EngagementEvent`. Gate: typecheck, weekly
   mission generates deterministically per ISO week.
4. **T3 — Weekly Mission hook wiring + card UI.** `recordWeeklyMission*` calls; `weekly-mission-
   card.tsx`. Gate: browser-verify progress/completion/XP award.
5. **T4 — Save migration v1→v2 + Save Indicator "n초 전".** Gate: scratchpad migration script
   passes; browser-verify indicator shows an incrementing "n초 전".
6. **T5 — Daily Reward.** `daily-reward.ts`; toast-item.tsx case; auto-claim wiring. Gate:
   browser-verify first-session-of-day toast + streak-day-7 bonus (simulate via localStorage
   date manipulation).
7. **T6 — Leaderboard weekly tab + personal rank + contrast fix.** `0009_sprint10.sql` (RPC),
   `scores.ts`, `leaderboard.tsx`. Gate: browser-verify 3 tabs + "내 순위" line; re-run Lighthouse
   color-contrast audit on a game page to confirm the fix.
8. **T7 — Category leaderboard UI.** `category-leaderboard.tsx`. Gate: browser-verify on a
   multi-game category.
9. **T8 — Competitive UI cards + Continue Playing enhancement.** `season-card.tsx`, `player-rank-
   card.tsx`, `continue-playing-card.tsx` update, wire all into `page.tsx`. Gate: browser-verify
   homepage.
10. **T9 — SameGame.** Engine + component, Save SDK from the start. Gate: keyboard+touch, clear
    logic, resume works.
11. **T10 — Arkanoid DX.** Engine + component (multi-stage + power-ups), Save SDK from the start.
    Gate: keyboard+touch, stage progression, power-up pickup, resume works.
12. **T11 — Registration + migration finish.** `playable-games.ts`, `game-player.tsx`, `apps/web/
    package.json`, thumbnails, finish `0009_sprint10.sql` game inserts. Gate: both games load in
    prod-equivalent build.
13. **T12 — Final QA.** Root typecheck/lint/build (clean install), mobile 375px, Lighthouse
    regression check, Save/Resume regression pass across all 10 games, commit+push, Vercel deploy
    verification, final PM report.

## Verification
- Season XP accrues from play/score-report/ranking/missions/weekly-missions, independent of and
  in parallel with lifetime XP (both visibly increase from the same actions, at their own rates)
- Weekly mission regenerates deterministically per ISO week (same week = same mission across
  reloads), completes, awards XP, shows a toast
- Save migration script: a hand-written v1 envelope loads correctly as v2 with `deviceId` filled
- Save Indicator shows a live-incrementing "n초 전" after the initial Saving/Saved flash
- Daily Reward auto-claims once per day, day-7 bonus verified via simulated streak state
- Leaderboard: Today/Weekly/All-Time all return correct filtered results; "내 순위" shows the
  correct rank or "unranked" with no score; color-contrast audit passes on the tab buttons
- Category leaderboard UI lists all games in a multi-game category with working per-game ranks
- Homepage shows Season/Weekly Mission/Player Rank cards; Continue Playing shows level + best
  score per card
- SameGame and Arkanoid DX: keyboard + touch input both work; resume restores exact state; both
  auto-integrate with Leaderboard/XP/Season/Weekly Mission via the same hook points as every
  other game (no bespoke per-game wiring)
- Full regression: all 10 games' save/resume still work after this sprint's changes (Sprint 9's
  save.ts contract didn't change shape in a way that breaks existing saves — only the envelope
  gained a new field, backward-compatible via migration)
- Root typecheck/lint/build clean (clean install), mobile 375px, Lighthouse no regression, git
  push + Vercel deploy confirmed
