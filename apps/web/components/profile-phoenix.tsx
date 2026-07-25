"use client";

import type { Game } from "@game-platform/shared";
import { Badge, Button } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { JourneyHeatMap } from "@/components/journey-heat-map";
import { ProfileCoinsBadge } from "@/components/profile-coins-badge";
import { ProfileReplayScore } from "@/components/profile-replay-score";
import { getFollowers, getFollowing, getFriendsList, getOnlineFriends, subscribeSocial, toggleFollow } from "@/lib/social-store";
import { getEquippedAvatar, getEquippedFrame, getSeasonPassProgress } from "@/lib/shop-store";
import { buildWrappedSnapshot } from "@/lib/wrapped-data";
import { subscribeLiveData } from "@/lib/live-data-bus";

export function ProfileSocialStrip() {
  useSyncExternalStore(subscribeSocial, () => getFollowing().length, () => 0);
  const following = getFollowing();
  const followers = getFollowers();
  const online = getOnlineFriends();

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-2xl font-bold">{followers.length}</p>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{following.length}</p>
          <p className="text-xs text-muted-foreground">Following</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-400">{online.length}</p>
          <p className="text-xs text-muted-foreground">Online</p>
        </div>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/community">Find Friends</Link>} />
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {getFriendsList().map((f) => (
          <li key={f.id} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm">
            <span className={`size-2 rounded-full ${f.online ? "bg-emerald-400" : "bg-muted"}`} />
            {f.nickname}
            <Badge variant="outline" className="text-[10px]">Lv.{f.level}</Badge>
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => toggleFollow(f.id)}
            >
              {following.includes(f.id) ? "Unfollow" : "Follow"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProfileHero2({
  nickname,
  level,
  onEdit,
}: {
  nickname: string;
  level: number;
  onEdit: () => void;
}) {
  const avatar = getEquippedAvatar();
  const frame = getEquippedFrame();
  const season = getSeasonPassProgress();

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex size-20 items-center justify-center rounded-2xl border-2 border-primary/30 bg-background/80 text-4xl shadow-xl">
            {frame ? <span className="absolute -right-1 -top-1 text-lg">{frame}</span> : null}
            {avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold sm:text-3xl">{nickname || "Guest"}</h2>
              <button type="button" onClick={onEdit} className="text-xs text-primary underline">
                Edit
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Lv.{level} · Project Phoenix Profile</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ProfileCoinsBadge />
              <Badge variant="outline">Season Pass Lv.{season.level}</Badge>
            </div>
          </div>
        </div>
        <Button nativeButton={false} render={<Link href="/wrapped">View Wrapped →</Link>} />
      </div>
    </section>
  );
}

export function ProfileStatsGrid({ games }: { games: Game[] }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const snapshot = useMemo(() => buildWrappedSnapshot(games), [games]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Replay Score", value: snapshot.replayScore },
        { label: "Play Style", value: snapshot.playStyle },
        { label: "Top Genre", value: snapshot.favoriteGenre },
        { label: "Monthly", value: `${snapshot.monthlyMinutes}m` },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border border-white/10 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-lg font-bold">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ProfileHeatmapSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold">Activity Heatmap</h3>
      <div className="mt-3">
        <JourneyHeatMap />
      </div>
    </section>
  );
}

export function ProfileWrappedTeaser() {
  return (
    <section className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/20 to-transparent p-6">
      <ProfileReplayScore />
      <Button className="mt-4" nativeButton={false} render={<Link href="/wrapped">Open Replay Wrapped</Link>} />
    </section>
  );
}
