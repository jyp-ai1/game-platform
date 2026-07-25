"use client";

import { Users } from "lucide-react";
import { useSyncExternalStore } from "react";

import { getFriendsList } from "@/lib/social-store";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { replayCard } from "@/lib/replay-os";

export function GameDetailFriendRecord({ gameSlug }: { gameSlug: string }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const friends = getFriendsList();

  return (
    <section className={replayCard("p-5")}>
      <div className="flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <h3 className="font-semibold">Friends on {gameSlug}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {friends.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-background/40 px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${f.online ? "bg-emerald-400" : "bg-muted"}`} />
              {f.nickname}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {(1000 + f.level * 500).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FriendComparePanel({ gameSlug }: { gameSlug?: string }) {
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const friends = getFriendsList().slice(0, 5);

  return (
    <section className={replayCard("p-5")}>
      <h3 className="font-semibold">Friend Challenge</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {gameSlug ? `Compare scores on ${gameSlug}` : "Pick a game to challenge friends"}
      </p>
      <ul className="mt-3 space-y-2">
        {friends.map((f, i) => (
          <li key={f.id} className="flex items-center justify-between text-sm">
            <span>#{i + 1} {f.nickname}</span>
            <button type="button" className="text-xs text-primary hover:underline">
              Challenge
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
