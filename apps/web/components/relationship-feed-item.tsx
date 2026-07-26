"use client";

import type { RelationshipEvent } from "@/lib/relationship-feed";
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

const REACTIONS: Array<{ type: ReactionType; emoji: string }> = [
  { type: "like", emoji: "👍" },
  { type: "fire", emoji: "🔥" },
  { type: "cheer", emoji: "🎉" },
  { type: "challenge", emoji: "⚔️" },
];

export function RelationshipFeedItem({ item }: { item: RelationshipEvent }) {
  useSyncExternalStore(subscribeSocialReactions, () => item.id, () => item.id);
  const counts = getReactionCounts(item.id);

  return (
    <div className="rounded-xl border border-white/5 bg-background/40 px-3 py-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{item.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{item.friendName}</p>
          <p className="text-sm font-medium text-primary">{item.headline}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.detail} · {formatWhen(item.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {REACTIONS.map((r) => (
          <button
            key={r.type}
            type="button"
            onClick={() => addReaction(item.id, r.type)}
            className="rounded-full border border-white/10 bg-card/60 px-2.5 py-1 text-xs hover:border-primary/40"
          >
            {r.emoji}{(counts[r.type] ?? 0) > 0 ? ` ${counts[r.type]}` : ""}
          </button>
        ))}
        <Link
          href={item.ctaHref}
          className="ml-auto rounded-full bg-primary/15 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/25"
        >
          {item.ctaLabel} →
        </Link>
      </div>
    </div>
  );
}
