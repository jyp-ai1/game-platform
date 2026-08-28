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
import { useEffect, useState, useSyncExternalStore } from "react";

import { GuestIdentityPanel } from "@/components/guest-identity-panel";
import { AchievementGrid } from "@/components/achievement-grid";
import { PlayerStats } from "@/components/player-stats";
import { getPlayerId } from "@/lib/auth/player-id";
import { usePlayerAuth } from "@/components/auth-provider";
import { MyPageHistoryPanel } from "@/components/my-page-history";
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
  const { isAuthenticated, displayName, avatarUrl, user } = usePlayerAuth();
  useEffect(() => {
    trackAnalyticsEvent("profile_open", { deviceId: getPlayerId() }).catch(() => {});
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

  // Sprint 19 — prefer auth display name when nickname still default Guest
  useEffect(() => {
    if (!isAuthenticated || !displayName) return;
    if (!nickname || nickname === "Guest" || nickname === "Player") {
      setLastNickname(displayName.slice(0, 20));
    }
  }, [isAuthenticated, displayName, nickname]);

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed) setLastNickname(trimmed);
    setEditing(false);
  }

  const shownName = nickname || displayName;

  return (
    <div className="flex flex-col gap-10" data-testid="my-page">
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
        <div className="flex flex-wrap items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              className="size-16 rounded-full object-cover ring-2 ring-white/20"
              data-testid="profile-avatar"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <ProfileHero2
              nickname={shownName}
              level={levelProgress.level}
              onEdit={() => {
                setDraft(shownName);
                setEditing(true);
              }}
            />
            {isAuthenticated && user?.email ? (
              <p className="mt-1 text-xs text-muted-foreground" data-testid="profile-email">
                {user.email} · Google session
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-200/80">
                로그인하면 닉네임·프로필 이미지가 계정에 연결됩니다 (LIVE OAuth: CEO HOLD)
              </p>
            )}
          </div>
        </div>
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

      <MyPageHistoryPanel games={games} />

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
