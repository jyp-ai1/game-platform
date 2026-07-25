"use client";

import type { Game } from "@game-platform/shared";
import { Badge } from "@game-platform/ui";
import { useSyncExternalStore } from "react";

import { getFriendsList, getOnlineFriends, subscribeSocial } from "@/lib/social-store";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { replayCard } from "@/lib/replay-os";

export function SocialActivityFeed() {
  useSyncExternalStore(subscribeSocial, () => 0, () => 0);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const friends = getFriendsList();
  const online = getOnlineFriends();

  const activities = [
    ...online.map((f) => ({ id: f.id, text: `${f.nickname} is playing now`, time: "live" })),
    ...friends.slice(0, 5).map((f, i) => ({
      id: `act-${f.id}`,
      text: `${f.nickname} reached Lv.${f.level}`,
      time: `${i + 1}h ago`,
    })),
  ];

  return (
    <section className={replayCard("p-5")}>
      <h3 className="font-semibold">Activity Feed</h3>
      <ul className="mt-3 space-y-2">
        {activities.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <span>{a.text}</span>
            <Badge variant="outline" className="text-[10px]">
              {a.time}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

function friendScore(id: string, level: number): number {
  const seed = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return level * 1000 + (seed % 900);
}

export function WeeklyLeaguePanel({ games }: { games: Game[] }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const friends = getFriendsList()
    .map((f) => ({ ...f, score: friendScore(f.id, f.level) }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className={replayCard("p-5")}>
      <h3 className="font-semibold">Weekly League</h3>
      <p className="mt-1 text-xs text-muted-foreground">Friend rankings · {games.length} games live</p>
      <ol className="mt-4 space-y-2">
        {friends.map((f, i) => (
          <li key={f.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-primary/5">
            <span>
              <span className="mr-2 font-bold text-primary">#{i + 1}</span>
              {f.nickname}
            </span>
            <span className="tabular-nums font-medium">{f.score.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
