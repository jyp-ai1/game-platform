"use client";

import {
  getLastNickname,
  getLevelProgress,
  getDeviceId,
  getServerLevelProgressSnapshot,
  getServerNicknameSnapshot,
  setLastNickname,
  subscribeEngagement,
  subscribeNickname,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button, Progress } from "@game-platform/ui";
import { useEffect, useState, useSyncExternalStore } from "react";

import { AchievementGrid } from "@/components/achievement-grid";
import { PlayerStats } from "@/components/player-stats";
import {
  ProfileQuickLinks,
  ProfileRecentGames,
} from "@/components/profile-recent-games";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";
import { useCountUp } from "@/lib/use-count-up";
import { useMounted } from "@/lib/use-mounted";

export function ProfileClient({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useEffect(() => {
    trackAnalyticsEvent("profile_open", { deviceId: getDeviceId() }).catch(() => {});
  }, []);

  const nickname = useSyncExternalStore(
    subscribeNickname,
    getLastNickname,
    getServerNicknameSnapshot
  );
  const levelProgress = useSyncExternalStore(
    subscribeEngagement,
    getLevelProgress,
    getServerLevelProgressSnapshot
  );

  const [draft, setDraft] = useState(nickname);
  const [editing, setEditing] = useState(false);

  const animatedXp = useCountUp(levelProgress.xpIntoLevel);

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed) {
      setLastNickname(trimmed);
    }
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Game Life Profile
        </p>
        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {editing ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSave();
                }}
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={20}
                  placeholder="닉네임"
                  aria-label="닉네임 입력"
                  className="rounded-md border bg-background px-3 py-2 text-xl font-bold"
                />
                <Button type="submit" size="sm">
                  저장
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(nickname);
                    setEditing(false);
                  }}
                  className="text-xs text-muted-foreground underline"
                >
                  취소
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold sm:text-3xl">
                  {nickname || "게스트 플레이어"}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(nickname);
                    setEditing(true);
                  }}
                  className="text-xs font-medium text-primary underline"
                >
                  수정
                </button>
              </div>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              내 게임 인생 — 플레이, 성장, 경쟁의 기록
            </p>
            <div className="mt-4">
              <ProfileQuickLinks />
            </div>
          </div>

          <div className="min-w-56">
            {mounted ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Lv.{levelProgress.level}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {animatedXp.toLocaleString()} /{" "}
                    {levelProgress.xpNeededForLevel.toLocaleString()} XP
                  </span>
                </div>
                <Progress
                  value={levelProgress.percent}
                  label={`레벨 ${levelProgress.level} 진행률`}
                  className="mt-2"
                />
              </>
            ) : (
              <Progress value={0} label="레벨 진행률" />
            )}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">최근 플레이</h3>
        <div className="mt-3">
          <ProfileRecentGames games={games} />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">통계</h3>
        <div className="mt-3">
          <PlayerStats games={games} />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">업적</h3>
        <div className="mt-3">
          <AchievementGrid />
        </div>
      </section>
    </div>
  );
}
