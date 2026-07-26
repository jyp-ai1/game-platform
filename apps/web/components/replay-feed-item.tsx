"use client";

import type { StoryEvent } from "@/lib/replay-story-feed";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  addReaction,
  getReactionCounts,
  subscribeSocialReactions,
  type ReactionType,
} from "@/lib/social-reactions-store";

function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
}

const REACTIONS: Array<{ type: ReactionType; label: string; emoji: string }> = [
  { type: "like", label: "👍", emoji: "👍" },
  { type: "fire", label: "🔥", emoji: "🔥" },
  { type: "cheer", label: "축하", emoji: "🎉" },
  { type: "challenge", label: "도전", emoji: "⚔️" },
];

export function ReplayFeedItem({
  item,
  challengeHref,
}: {
  item: StoryEvent;
  challengeHref?: string;
}) {
  useSyncExternalStore(subscribeSocialReactions, () => item.id, () => item.id);
  const counts = getReactionCounts(item.id);
  const isFriend = item.actor !== "나";

  return (
    <div className="rounded-xl border border-white/5 bg-background/40 px-3 py-3">
      <Link href={item.href} className="flex items-start gap-3 text-sm">
        <span className="text-lg">{item.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{item.actor}</p>
          <p className="font-medium">{item.headline}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.detail} · {formatWhen(item.createdAt)}
          </p>
        </div>
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {REACTIONS.map((r) => (
          <button
            key={r.type}
            type="button"
            onClick={() => addReaction(item.id, r.type)}
            className="rounded-full border border-white/10 bg-card/60 px-2.5 py-1 text-xs transition-colors hover:border-primary/40"
          >
            {r.emoji}{" "}
            {(counts[r.type] ?? 0) > 0 ? (
              <span className="tabular-nums">{counts[r.type]}</span>
            ) : null}
          </button>
        ))}
        {isFriend && challengeHref ? (
          <Link
            href={challengeHref}
            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400"
          >
            재도전 →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
