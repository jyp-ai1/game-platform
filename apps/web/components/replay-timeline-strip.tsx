"use client";

import type { Game } from "@game-platform/shared";
import { Container } from "@game-platform/ui";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { emotionalizeStoryEvent } from "@/lib/emotion-engine";
import { getFriendBeatGap } from "@/lib/replay-identity";
import { buildReplayStoryFeed } from "@/lib/replay-story-feed";
import { getTodayMissionProgress, isTodayMissionMixComplete } from "@/lib/universal-mission-engine";
import { getGenreCollections } from "@/lib/collection-engine";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { useMounted } from "@/lib/use-mounted";

/** Home mini timeline — SNS-style emotional beats. */
export function ReplayTimelineStrip({ games }: { games: Game[] }) {
  const mounted = useMounted();
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  const beats = useMemo(() => {
    if (!mounted) return [];
    const items: Array<{ emoji: string; text: string; sub: string; href: string }> = [];

    const friend = getFriendBeatGap(games[0]?.slug ?? "snake", 5000);
    if (friend.gap < 0) {
      items.push({
        emoji: "👥",
        text: `친구 ${friend.nickname}보다 ${Math.abs(friend.gap).toLocaleString()}점 앞섰습니다`,
        sub: "오늘",
        href: `/games/${games[0]?.slug ?? "snake"}`,
      });
    }

    const col = getGenreCollections(games).find((c) => c.percent >= 60);
    if (col) {
      items.push({
        emoji: col.emoji,
        text: `${col.label} Collection ${col.percent}% 달성`,
        sub: "수집 중",
        href: `/categories/${col.genre}`,
      });
    }

    const feed = buildReplayStoryFeed(games, 4)
      .filter((e) => e.type === "achievement" || e.type === "new_best")
      .map(emotionalizeStoryEvent);
    for (const e of feed.slice(0, 1)) {
      items.push({ emoji: e.emoji, text: e.headline, sub: e.detail, href: e.href });
    }

    if (isTodayMissionMixComplete()) {
      items.push({
        emoji: "🎯",
        text: "오늘 미션 완료",
        sub: "+100 Coin",
        href: "/missions",
      });
    } else {
      const m = getTodayMissionProgress();
      items.push({
        emoji: "📋",
        text: `오늘 미션 ${m.done}/${m.total}`,
        sub: "진행 중",
        href: "/missions",
      });
    }

    return items.slice(0, 4);
  }, [games, mounted]);

  if (!mounted || beats.length === 0) return null;

  return (
    <section className="border-b border-white/5 py-6">
      <Container>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Replay Timeline</h2>
          <Link href="/journey" className="text-xs text-primary hover:underline">
            전체 →
          </Link>
        </div>
        <ol className="mt-4 space-y-3">
          {beats.map((b, i) => (
            <li key={`${b.text}-${i}`}>
              <Link
                href={b.href}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-card/40 px-4 py-3 transition-colors hover:border-primary/30"
              >
                <span className="text-lg">{b.emoji}</span>
                <div>
                  <p className="text-sm font-medium">{b.text}</p>
                  <p className="text-xs text-muted-foreground">{b.sub}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
