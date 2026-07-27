"use client";

import type { Game } from "@game-platform/shared";
import { enterSnakeQuickPlay, enterSnakeRoom, PRACTICE_URL } from "@/lib/snake-entry";
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
import { useMounted } from "@/lib/use-mounted";

export interface SnakeFriendPresence {
  nickname: string;
  playHref: string;
  spectateHref?: string;
  joinedMinutesAgo?: number;
  score?: number;
  statusLabel?: string;
}

function defaultLiveMeta() {
  return {
    players: GLOBAL_WORLD_TARGET,
    maxPlayers: GLOBAL_WORLD_TARGET,
    topScore: undefined as number | undefined,
    topRankLabel: "TOP #1" as const,
    animatePlayers: true,
  };
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
  const mounted = useMounted();
  const [joining, setJoining] = useState(false);
  const [joiningFriend, setJoiningFriend] = useState(false);
  const [liveMeta, setLiveMeta] = useState(defaultLiveMeta);

  useEffect(() => {
    setLiveMeta(readLiveMeta());
    const id = window.setInterval(() => setLiveMeta(readLiveMeta()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const displayLive = mounted ? liveMeta : defaultLiveMeta();

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
    if (!mounted || !friend) return null;
    return {
      nickname: friend.nickname,
      joinedMinutesAgo: friend.joinedMinutesAgo,
      score: friend.score,
      statusLabel: friend.statusLabel,
    };
  }, [friend, mounted]);

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
    try {
      const match = friend.playHref.match(/room=([^&]+)/);
      const roomCode = match ? decodeURIComponent(match[1]!) : "WORLD";
      await enterSnakeRoom(router, roomCode);
    } catch (err) {
      entryLogFail("JOIN", err instanceof Error ? err.message : String(err));
      router.push(PRACTICE_URL);
    } finally {
      setJoiningFriend(false);
    }
  }, [friend, router]);

  return (
    <PlatformGameCard
      game={displayGame}
      live={displayLive}
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
