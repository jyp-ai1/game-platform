"use client";

import type { Game } from "@game-platform/shared";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { RelationshipFeedItem } from "@/components/relationship-feed-item";
import { buildRelationshipFeed } from "@/lib/relationship-feed";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { subscribeChallenges } from "@/lib/challenge-scores-store";
import { subscribeSocialReactions } from "@/lib/social-reactions-store";
import { subscribeSocial } from "@/lib/social-store";
import { useMounted } from "@/lib/use-mounted";

/** Relationship Feed — 친구 때문에 들어오는 플랫폼. */
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
    return buildRelationshipFeed(games, 12);
  }, [games, mounted, tick]);

  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card/60 p-5 backdrop-blur">
      <h2 className="text-lg font-bold">Relationship Feed</h2>
      <p className="mt-1 text-sm text-muted-foreground">추월 · 도전 · 업적 · 반응</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">친구 활동이 없습니다.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <RelationshipFeedItem item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
