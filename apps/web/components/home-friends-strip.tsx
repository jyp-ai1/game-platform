"use client";

import { Badge } from "@game-platform/ui";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { subscribeLiveData } from "@/lib/live-data-bus";
import { getFriendsList, getOnlineFriends, subscribeSocial } from "@/lib/social-store";

export function HomeFriendsStrip() {
  useSyncExternalStore(subscribeSocial, () => 0, () => 0);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const online = getOnlineFriends();
  const friends = getFriendsList();

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Friends</h3>
        <Link href="/community" className="text-xs text-primary hover:underline">
          Community →
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {online.length > 0 ? (
          online.map((f) => (
            <li key={f.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                {f.nickname}
              </span>
              <Badge variant="outline" className="text-[10px]">
                Playing
              </Badge>
            </li>
          ))
        ) : (
          friends.slice(0, 3).map((f) => (
            <li key={f.id} className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{f.nickname}</span>
              <span className="text-xs">Lv.{f.level}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
