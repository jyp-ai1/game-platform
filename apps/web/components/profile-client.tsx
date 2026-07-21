"use client";

import {
  getLastNickname,
  getLevelProgress,
  getServerLevelProgressSnapshot,
  getServerNicknameSnapshot,
  setLastNickname,
  subscribeEngagement,
  subscribeNickname,
} from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button, Progress } from "@game-platform/ui";
import { useState, useSyncExternalStore } from "react";

import { AchievementGrid } from "@/components/achievement-grid";
import { PlayerStats } from "@/components/player-stats";
import { useCountUp } from "@/lib/use-count-up";

export function ProfileClient({ games }: { games: Game[] }) {
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
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">닉네임</p>
            {editing ? (
              <form
                className="mt-1 flex items-center gap-2"
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
                  className="rounded-md border bg-background px-3 py-1.5 text-lg font-semibold"
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
              <div className="mt-1 flex items-center gap-2">
                <p className="text-lg font-semibold">
                  {nickname || "닉네임을 설정해주세요"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(nickname);
                    setEditing(true);
                  }}
                  className="text-xs font-medium text-foreground underline"
                >
                  수정
                </button>
              </div>
            )}
          </div>

          <div className="min-w-48 flex-1 sm:flex-none">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Lv.{levelProgress.level}</span>
              <span className="tabular-nums">
                {animatedXp.toLocaleString()} /{" "}
                {levelProgress.xpNeededForLevel.toLocaleString()} XP
              </span>
            </div>
            <Progress
              value={levelProgress.percent}
              label={`레벨 ${levelProgress.level} 진행률`}
              className="mt-1.5"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">통계</h2>
        <div className="mt-3">
          <PlayerStats games={games} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">업적</h2>
        <div className="mt-3">
          <AchievementGrid />
        </div>
      </section>
    </div>
  );
}
