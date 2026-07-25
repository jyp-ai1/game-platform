"use client";

import type { Game } from "@game-platform/shared";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { buildReplayStoryFeed } from "@/lib/replay-story-feed";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { subscribeChallenges } from "@/lib/challenge-scores-store";
import { subscribeSocial } from "@/lib/social-store";
import { useMounted } from "@/lib/use-mounted";

function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
}

export function CommunityActivityFeed({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeSocial, () => 0, () => 0);
  useSyncExternalStore(subscribeChallenges, () => 0, () => 0);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 8000);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(() => {
    if (!mounted) return [];
    void tick;
    return buildReplayStoryFeed(games, 14);
  }, [games, mounted, tick]);

  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card/60 p-5 backdrop-blur">
      <h2 className="text-lg font-bold">오늘 Replay 활동</h2>
      <p className="mt-1 text-sm text-muted-foreground">친구 · 나 · 도전 · 업적</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">활동이 없습니다. 게임을 플레이해보세요.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-background/40 px-3 py-3 text-sm transition-colors hover:border-primary/30"
              >
                <span className="text-lg">{item.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-semibold">{item.actor}</span>{" "}
                    <span className="text-muted-foreground">{item.headline}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.detail} · {formatWhen(item.createdAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
