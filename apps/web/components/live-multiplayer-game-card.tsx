"use client";

import type { Game } from "@game-platform/shared";
import { GlobalWorldPersist } from "@game-platform/game-snake";
import {
  getGlobalWorldStatus,
  GLOBAL_WORLD_TARGET,
} from "@game-platform/multiplayer-sdk";
import { useEffect, useMemo, useState } from "react";

import {
  PlatformGameCard,
  type PlatformGameCardFriend,
} from "@/components/platform-game-card";
import { detailHrefForCatalogSlug, REPLAY_CARD_CTA } from "@/lib/game-catalog";
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

/**
 * Home Multiplayer strip — unified LIVE card for all realtime games.
 * MP-DETAIL-001: card → Game Detail only (never Character lobby).
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
  const mounted = useMounted();
  const slug = game.slug;
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

  const detailHref = detailHrefForCatalogSlug(slug);

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
          label: REPLAY_CARD_CTA,
          href: detailHref,
        },
        secondary: friend
          ? {
              label: "같이하기",
              onClick: () => {
                if (typeof window !== "undefined") {
                  window.location.href = friend.playHref || detailHref;
                }
              },
            }
          : undefined,
      }}
    />
  );
}
