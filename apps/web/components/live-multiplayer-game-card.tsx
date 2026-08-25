"use client";

import type { Game } from "@game-platform/shared";
import { GlobalWorldPersist } from "@game-platform/game-snake";
import { entryLogFail } from "@game-platform/game-snake";
import {
  getGlobalWorldStatus,
  GLOBAL_WORLD_TARGET,
  quickPlayGlobal,
} from "@game-platform/multiplayer-sdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PlatformGameCard,
  type PlatformGameCardFriend,
} from "@/components/platform-game-card";
import { enterSnakeQuickPlay, enterSnakeRoom, PRACTICE_URL } from "@/lib/snake-entry";
import { useMounted } from "@/lib/use-mounted";

export interface LiveMultiplayerFriendPresence {
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

/** Shared LIVE count — same Global World status source as Snake (per-slug). */
function readLiveMeta(slug: string) {
  const status = getGlobalWorldStatus(slug);
  let topScore: number | undefined;
  if (slug === "snake") {
    const persisted = GlobalWorldPersist.load("WORLD");
    const brief = persisted ? GlobalWorldPersist.joinBrief(persisted) : null;
    topScore = brief?.topScore;
  }
  return {
    players: status.humans || status.live || GLOBAL_WORLD_TARGET,
    maxPlayers: GLOBAL_WORLD_TARGET,
    topScore,
    topRankLabel: "TOP #1" as const,
    animatePlayers: true,
  };
}

function playHrefForSlug(slug: string): string {
  if (slug === "snake") return "/flagship/snake-io/play?room=WORLD";
  if (slug === "bomber") return "/games/bomber/play";
  if (slug === "agar") return "/games/agar/play";
  return `/games/${slug}/play`;
}

/**
 * Home Multiplayer strip — unified LIVE card for all realtime games
 * (snake, agar, future REALTIME_GAMES).
 */
export function LiveMultiplayerGameCard({
  game,
  friend,
  className,
}: {
  game: Game;
  friend?: LiveMultiplayerFriendPresence | null;
  className?: string;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const slug = game.slug;
  const [joining, setJoining] = useState(false);
  const [joiningFriend, setJoiningFriend] = useState(false);
  const [liveMeta, setLiveMeta] = useState(defaultLiveMeta);

  useEffect(() => {
    setLiveMeta(readLiveMeta(slug));
    const id = window.setInterval(() => setLiveMeta(readLiveMeta(slug)), 5000);
    return () => window.clearInterval(id);
  }, [slug]);

  const displayLive = mounted ? liveMeta : defaultLiveMeta();

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
      if (slug === "snake") {
        await enterSnakeQuickPlay(router);
        return;
      }
      try {
        const { href } = await quickPlayGlobal(slug);
        // Prefer /play path for agar/bomber scaffold; keep room query when present.
        const playBase = playHrefForSlug(slug);
        const roomMatch = href.match(/[?&]room=([^&]+)/);
        const fallbackRoom = slug === "bomber" ? "ROOM" : slug === "agar" ? "WORLD" : null;
        const room = roomMatch?.[1] ?? fallbackRoom;
        router.push(room ? `${playBase}?room=${room}` : playBase);
      } catch {
        const fallback =
          slug === "bomber"
            ? "/games/bomber/play?room=ROOM"
            : slug === "agar"
              ? "/games/agar/play?room=WORLD"
              : playHrefForSlug(slug);
        router.push(fallback);
      }
    } finally {
      setJoining(false);
    }
  }, [router, slug]);

  const handleJoinFriend = useCallback(async () => {
    if (!friend) return;
    setJoiningFriend(true);
    try {
      if (slug === "snake") {
        const match = friend.playHref.match(/room=([^&]+)/);
        const roomCode = match ? decodeURIComponent(match[1]!) : "WORLD";
        await enterSnakeRoom(router, roomCode);
        return;
      }
      router.push(friend.playHref || playHrefForSlug(slug));
    } catch (err) {
      entryLogFail("JOIN", err instanceof Error ? err.message : String(err));
      if (slug === "snake") router.push(PRACTICE_URL);
      else router.push(playHrefForSlug(slug));
    } finally {
      setJoiningFriend(false);
    }
  }, [friend, router, slug]);

  return (
    <PlatformGameCard
      game={game}
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
