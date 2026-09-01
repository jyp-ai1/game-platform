"use client";

import type { Game } from "@game-platform/shared";

import {
  LiveMultiplayerGameCard,
  type LiveMultiplayerFriendPresence,
} from "@/components/live-multiplayer-game-card";

export type SnakeFriendPresence = LiveMultiplayerFriendPresence;

/** @deprecated Prefer LiveMultiplayerGameCard — kept for Snake-specific call sites. */
export function SnakeLiveGameCard({
  game,
  friend,
  className,
}: {
  game?: Game | null;
  friend?: SnakeFriendPresence | null;
  className?: string;
}) {
  const displayGame: Game =
    game ??
    ({
      id: "snake",
      slug: "snake",
      title: "Snake.io",
      description: "",
      thumbnailUrl: null,
      difficulty: "EASY",
      status: "ACTIVE",
      sortOrder: 0,
      categoryId: null,
      category: null,
      isFeatured: true,
      tags: [],
      howToPlay: null,
      playCount: 50000,
      nostalgiaNote: null,
      playUrl: null,
      sourceType: "native",
      createdAt: "",
      updatedAt: "",
    } satisfies Game);

  return (
    <LiveMultiplayerGameCard game={displayGame} friend={friend} className={className} />
  );
}
