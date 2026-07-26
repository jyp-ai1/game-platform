"use client";

import type { Game } from "@game-platform/shared";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { emotionalizeStoryEvent } from "@/lib/emotion-engine";
import { buildReplayFeedItems } from "@/lib/network-engine";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { subscribeChallenges } from "@/lib/challenge-scores-store";
import { subscribeSocialReactions } from "@/lib/social-reactions-store";
import { subscribeSocial } from "@/lib/social-store";
import { ReplayFeedItem } from "@/components/replay-feed-item";
import { useMounted } from "@/lib/use-mounted";

/** Replay Feed — game SNS with reactions (Social Loop). */
export function CommunityActivityFeed({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeSocial, () => 0, () => 0);
  useSyncExternalStore(subscribeChallenges, () => 0, () => 0);
  useSyncExternalStore(subscribeSocialReactions, () => 0, () => 0);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 8000);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(() => {
    if (!mounted) return [];
    void tick;
    return buildReplayFeedItems(games, 14).map(emotionalizeStoryEvent);
  }, [games, mounted, tick]);

  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card/60 p-5 backdrop-blur">
      <h2 className="text-lg font-bold">Replay Feed</h2>
      <p className="mt-1 text-sm text-muted-foreground">활동 · 반응 · 재도전</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">활동이 없습니다. 게임을 플레이해보세요.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <ReplayFeedItem
                item={item}
                challengeHref={
                  item.actor !== "나" && item.href.includes("/games/")
                    ? `${item.href}${item.href.includes("?") ? "&" : "?"}from=feed`
                    : `/community?challenge=${item.href.split("/games/")[1]?.split("?")[0] ?? "snake"}`
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
