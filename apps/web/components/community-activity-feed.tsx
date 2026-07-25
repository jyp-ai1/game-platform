"use client";

import { getBestScore } from "@game-platform/game-sdk";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Heart, MessageCircle, Share2, Flag, Trophy } from "lucide-react";

import { getRecentActivity, type ActivityItem } from "@/lib/community-store";
import { getFriendsList, subscribeSocial } from "@/lib/social-store";
import { subscribeLiveData } from "@/lib/live-data-bus";
import { getPlayHistorySnapshot } from "@/lib/play-history";

type FeedItem = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  href: string;
  createdAt: string;
  type: "score" | "achievement" | "comment";
};

function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function buildFeed(): FeedItem[] {
  const history = getPlayHistorySnapshot().slice(0, 5);
  const friends = getFriendsList();
  const base = getRecentActivity(12);

  const fromPlays: FeedItem[] = history.map((e) => ({
    id: `play-${e.id}`,
    actor: friends[0]?.nickname ?? "You",
    action: "scored in",
    detail: `${e.slug} · ${getBestScore(e.slug).toLocaleString()} pts`,
    href: `/games/${e.slug}`,
    createdAt: e.startedAt,
    type: "score",
  }));

  const fromFriends: FeedItem[] = friends.slice(0, 3).map((f, i) => ({
    id: `friend-${f.id}`,
    actor: f.nickname,
    action: i === 1 ? "earned achievement" : "scored in",
    detail: i === 1 ? "Snake Master" : `Snake · ${(9000 - i * 500).toLocaleString()} pts`,
    href: "/community",
    createdAt: new Date(Date.now() - (i + 1) * 120_000).toISOString(),
    type: i === 1 ? "achievement" : "score",
  }));

  const fromComments: FeedItem[] = base
    .filter((a) => a.id.startsWith("comment-"))
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      actor: a.label.split(" · ")[0] ?? "Player",
      action: "commented on",
      detail: a.label.split(" · ")[1] ?? "game",
      href: "/community",
      createdAt: a.createdAt,
      type: "comment" as const,
    }));

  return [...fromFriends, ...fromPlays, ...fromComments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
}

export function CommunityActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  useSyncExternalStore(subscribeSocial, () => 0, () => 0);
  useSyncExternalStore(subscribeLiveData, () => 0, () => 0);

  useEffect(() => {
    setItems(buildFeed());
    const id = setInterval(() => setItems(buildFeed()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <h2 className="font-semibold">Activity Feed</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No activity yet</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-white/5 bg-background/40 px-3 py-3 text-sm">
              <Link href={item.href} className="block hover:text-primary">
                <p>
                  <span className="font-semibold">{item.actor}</span>{" "}
                  <span className="text-muted-foreground">{item.action}</span>{" "}
                  <span>{item.detail}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatWhen(item.createdAt)}</p>
              </Link>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <button type="button" className="flex items-center gap-1 hover:text-red-400">
                  <Heart className="size-3" /> Like
                </button>
                <button type="button" className="flex items-center gap-1 hover:text-primary">
                  <MessageCircle className="size-3" /> Comment
                </button>
                <button type="button" className="flex items-center gap-1">
                  <Share2 className="size-3" /> Share
                </button>
                <button type="button" className="flex items-center gap-1">
                  <Flag className="size-3" /> Report
                </button>
                {item.type === "achievement" ? (
                  <Trophy className="size-3 text-amber-400" aria-label="Achievement" />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
