"use client";

import type { Game } from "@game-platform/shared";
import { enterSnakeQuickPlay, PRACTICE_URL } from "@/lib/snake-entry";
import {
  getGlobalWorldStatus,
  GLOBAL_WORLD_TARGET,
} from "@game-platform/multiplayer-sdk";
import { GlobalWorldPersist } from "@game-platform/game-snake";
import { entryLog, entryLogFail } from "@game-platform/game-snake";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PlatformGameCard,
  type PlatformGameCardFriend,
} from "@/components/platform-game-card";

export interface SnakeFriendPresence {
  nickname: string;
  playHref: string;
  spectateHref?: string;
  joinedMinutesAgo?: number;
  score?: number;
  statusLabel?: string;
}

function readLiveMeta() {
  const status = getGlobalWorldStatus("snake");
  const persisted = GlobalWorldPersist.load("WORLD");
  const brief = persisted ? GlobalWorldPersist.joinBrief(persisted) : null;
  return {
    players: status.humans || status.live || GLOBAL_WORLD_TARGET,
    maxPlayers: GLOBAL_WORLD_TARGET,
    topScore: brief?.topScore,
    topRankLabel: "TOP #1" as const,
    animatePlayers: true,
  };
}

/** Home hero — LIVE Snake on unified platform game card. */
export function SnakeLiveGameCard({
  game,
  friend,
  className,
}: {
  game?: Game | null;
  friend?: SnakeFriendPresence | null;
  className?: string;
}) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [joiningFriend, setJoiningFriend] = useState(false);
  const [liveMeta, setLiveMeta] = useState(readLiveMeta);

  useEffect(() => {
    const id = window.setInterval(() => setLiveMeta(readLiveMeta()), 5000);
    return () => window.clearInterval(id);
  }, []);

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
      createdAt: "",
      updatedAt: "",
    } satisfies Game);

  const cardFriend: PlatformGameCardFriend | null = useMemo(() => {
    if (!friend) return null;
    return {
      nickname: friend.nickname,
      joinedMinutesAgo: friend.joinedMinutesAgo,
      score: friend.score,
      statusLabel: friend.statusLabel,
    };
  }, [friend]);

  const handleQuickPlay = useCallback(async () => {
    setJoining(true);
    try {
      await enterSnakeQuickPlay(router);
    } finally {
      setJoining(false);
    }
  }, [router]);

  const handleJoinFriend = useCallback(async () => {
    if (!friend) return;
    setJoiningFriend(true);
    entryLog("CLICK", "home-join-friend");
    try {
      router.push(friend.playHref);
    } catch (err) {
      entryLogFail("JOIN", err instanceof Error ? err.message : String(err));
      entryLog("PRACTICE_FALLBACK", "join-friend");
      router.push(PRACTICE_URL);
    } finally {
      setJoiningFriend(false);
    }
  }, [friend, router]);

  return (
    <PlatformGameCard
      game={displayGame}
      live={liveMeta}
      friend={cardFriend}
      hero
      showFavorite={false}
      className={className}
      actions={{
        primary: {
          label: joining ? "입장 중…" : "바로 참가",
          onClick: handleQuickPlay,
          loading: joining,
        },
        secondary: friend
          ? {
              label: joiningFriend ? "입장 중…" : "같이하기",
              onClick: handleJoinFriend,
              loading: joiningFriend,
            }
          : undefined,
      }}
    />
  );
}
