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

import { GuestIdentityPanel } from "@/components/guest-identity-panel";
import { AchievementGrid } from "@/components/achievement-grid";
import { PlayerStats } from "@/components/player-stats";
import {
  ProfileHeatmapSection,
  ProfileHero2,
  ProfileSocialStrip,
  ProfileStatsGrid,
  ProfileWrappedTeaser,
} from "@/components/profile-phoenix";
import { ProfileCollections } from "@/components/profile-collections";
import { ProfileRecentGames } from "@/components/profile-recent-games";
import { ShopPanel } from "@/components/shop-panel";
import { recordAttendance } from "@/lib/shop-store";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";
import { useCountUp } from "@/lib/use-count-up";
import { useMounted } from "@/lib/use-mounted";

export function ProfileClient({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useEffect(() => {
    trackAnalyticsEvent("profile_open", { deviceId: getDeviceId() }).catch(() => {});
    recordAttendance();
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
    if (trimmed) setLastNickname(trimmed);
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-10">
      {editing ? (
        <form
          className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={20}
            className="rounded-md border bg-background px-3 py-2 font-bold"
            aria-label="Nickname"
          />
          <Button type="submit" size="sm">
            Save
          </Button>
          <button type="button" className="text-xs underline" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <ProfileHero2
          nickname={nickname}
          level={levelProgress.level}
          onEdit={() => {
            setDraft(nickname);
            setEditing(true);
          }}
        />
      )}

      {mounted ? (
        <div className="min-w-56 rounded-xl border border-white/10 bg-card/40 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Lv.{levelProgress.level}</span>
            <span className="tabular-nums text-muted-foreground">
              {animatedXp.toLocaleString()} / {levelProgress.xpNeededForLevel.toLocaleString()} XP
            </span>
          </div>
          <Progress value={levelProgress.percent} label="Level progress" className="mt-2" />
        </div>
      ) : null}

      <ProfileStatsGrid games={games} />
      <ProfileSocialStrip />
      <GuestIdentityPanel />
      <ProfileHeatmapSection />
      <ProfileWrappedTeaser />
      <ShopPanel />
      <ProfileCollections games={games} />

      <section>
        <h3 className="text-lg font-semibold">Recent Games</h3>
        <div className="mt-3">
          <ProfileRecentGames games={games} />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Statistics</h3>
        <div className="mt-3">
          <PlayerStats games={games} />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Achievements</h3>
        <div className="mt-3">
          <AchievementGrid />
        </div>
      </section>
    </div>
  );
}
