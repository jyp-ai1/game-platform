"use client";

import type { Difficulty, Game } from "@game-platform/shared";
import { Button, cn } from "@game-platform/ui";
import { Gamepad2, Star, Users, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import { GameCardPlayLink } from "@/components/game-card-play-link";
import { difficultyLabel, formatDifficulty } from "@/lib/difficulty";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/image-placeholder";
import { useLivePlayerCount } from "@/lib/use-live-player-count";
import { useMounted } from "@/lib/use-mounted";

/** Stable display rating for platform cards (no DB field yet). */
export function platformGameRating(slug: string): string {
  if (slug === "snake") return "4.8";
  const n = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (4.2 + (n % 6) / 10).toFixed(1);
}

function genreLabel(game: Game): string {
  if (game.slug === "snake") return "실시간 멀티플레이";
  const cat = game.category?.name;
  if (cat) return cat;
  return formatDifficulty(game.difficulty);
}

export interface PlatformGameCardLiveMeta {
  players: number;
  maxPlayers?: number;
  topScore?: number;
  topRankLabel?: string;
  /** When true, player count ticks every ~5s around base. */
  animatePlayers?: boolean;
}

export interface PlatformGameCardActions {
  primary: { label: string; onClick?: () => void; href?: string; loading?: boolean };
  secondary?: { label: string; onClick?: () => void; loading?: boolean };
}

export interface PlatformGameCardFriend {
  nickname: string;
  joinedMinutesAgo?: number;
  score?: number;
  statusLabel?: string;
}

type BadgeVariant = "easy" | "normal" | "hard" | "hot" | "new";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  easy: "bg-emerald-600/95 text-white",
  normal: "bg-sky-600/95 text-white",
  hard: "bg-red-600/95 text-white",
  hot: "bg-destructive text-white",
  new: "bg-amber-400 text-black",
};

function difficultyBadgeVariant(difficulty: Difficulty): BadgeVariant {
  if (difficulty === "EASY") return "easy";
  if (difficulty === "HARD") return "hard";
  return "normal";
}

function PlatformBadge({
  variant,
  children,
  className,
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        BADGE_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

function formatFriendPresence(friend: PlatformGameCardFriend): string {
  const parts: string[] = [];
  if (friend.joinedMinutesAgo != null) {
    parts.push(
      friend.joinedMinutesAgo <= 0 ? "방금 입장" : `${friend.joinedMinutesAgo}분 전 입장`
    );
  } else if (friend.statusLabel) {
    parts.push(friend.statusLabel);
  }
  if (friend.score != null && friend.score > 0) {
    parts.push(`현재 ${friend.score.toLocaleString()}점`);
  }
  return parts.join(" · ");
}

/** Steam/Epic-style platform game card — thumbnail-first, unified across home. */
export function PlatformGameCard({
  game,
  live,
  friend,
  actions,
  isHot,
  isNew,
  hero = false,
  showFavorite = true,
  className,
}: {
  game: Game;
  live?: PlatformGameCardLiveMeta;
  friend?: PlatformGameCardFriend | null;
  actions?: PlatformGameCardActions;
  isHot?: boolean;
  isNew?: boolean;
  /** Subtle motion + parallax — hero LIVE card only. */
  hero?: boolean;
  showFavorite?: boolean;
  className?: string;
}) {
  const isComingSoon = game.status === "COMING_SOON";
  const isMaintenance = game.status === "MAINTENANCE";
  const mounted = useMounted();
  const rating = platformGameRating(game.slug);
  const basePlayers = live?.players ?? 0;
  const animatedPlayers = useLivePlayerCount(basePlayers, 5000);
  const playerCount =
    !mounted || live?.animatePlayers === false || !live ? basePlayers : animatedPlayers;
  const playerLabel = live ? `${playerCount} Players` : `${Math.max(1, Math.round(game.playCount / 1000))}k plays`;
  const diffBadge = difficultyBadgeVariant(game.difficulty);

  return (
    <article
      data-testid={hero ? "home-hero-card" : undefined}
      className={cn(
        "group flex h-full min-h-[340px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-md motion-base transition-all",
        hero && "hover:scale-[1.01] hover:border-primary/30 hover:shadow-lg",
        !hero && "hover:border-primary/30 hover:shadow-lg",
        live && "border-emerald-500/35 shadow-emerald-500/10",
        className
      )}
    >
      {/* Thumbnail — ~60%+ of card height */}
      <div className="relative min-h-[200px] flex-[3] overflow-hidden bg-muted sm:min-h-[240px]">
        {game.thumbnailUrl ? (
          <Image
            src={game.thumbnailUrl}
            alt={`${game.title} thumbnail`}
            fill
            className={cn(
              "object-cover motion-base transition-transform",
              hero
                ? "scale-[1.02] group-hover:scale-[1.05] group-hover:-translate-y-0.5"
                : "group-hover:scale-[1.02]"
            )}
            sizes="(max-width:640px) 85vw, 320px"
            priority={!!live || hero}
            loading={live || hero ? undefined : "lazy"}
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-background">
            <Gamepad2 className="size-16 text-muted-foreground/60" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />

        {showFavorite && !isComingSoon ? (
          <FavoriteButton slug={game.slug} className="absolute left-2 top-2 z-10" />
        ) : null}

        {live ? (
          <div
            data-testid="platform-live-badge"
            className="live-badge-pulse absolute right-3 top-3 z-10 rounded-lg border border-emerald-500/40 bg-background/85 px-2.5 py-2 text-right backdrop-blur-sm"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">
              <span className="live-dot-pulse mr-1 inline-block">🟢</span>
              LIVE
            </p>
            <p className="text-sm font-semibold tabular-nums motion-base transition-all">
              {playerLabel}
            </p>
            {live.topScore != null && live.topScore > 0 && mounted ? (
              <p className="mt-0.5 text-[10px] text-amber-300/90">
                {live.topRankLabel ?? "TOP #1"} {live.topScore.toLocaleString()}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Meta + actions — compact footer */}
      <div className="flex flex-[2] flex-col gap-2 p-4">
        <div>
          <h3 className="text-lg font-bold leading-tight">{game.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{genreLabel(game)}</p>
          {!live && !isComingSoon && !isMaintenance ? (
            <div className="mt-2 flex flex-wrap gap-1">
              <PlatformBadge variant={diffBadge}>{difficultyLabel[game.difficulty]}</PlatformBadge>
              {isHot ? <PlatformBadge variant="hot">HOT</PlatformBadge> : null}
              {isNew ? <PlatformBadge variant="new">NEW</PlatformBadge> : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {rating}
          </span>
          <span className="inline-flex items-center gap-0.5 tabular-nums">
            <Users className="size-3" />
            {playerLabel}
          </span>
        </div>

        {friend && mounted ? (
          <p className="text-sm leading-snug">
            <span className="text-muted-foreground">👤 </span>
            <span className="font-medium">{friend.nickname}</span>
            {formatFriendPresence(friend) ? (
              <span className="text-muted-foreground"> · {formatFriendPresence(friend)}</span>
            ) : (
              <span className="text-muted-foreground"> · 플레이 중</span>
            )}
          </p>
        ) : null}

        {actions ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {actions.primary.href ? (
              <Button
                className={cn(
                  "gap-1.5 motion-base transition-transform hover:scale-[1.02] active:scale-[0.98]",
                  live && "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                )}
                nativeButton={false}
                render={
                  <GameCardPlayLink href={actions.primary.href}>
                    {actions.primary.label}
                  </GameCardPlayLink>
                }
              />
            ) : (
              <Button
                className={cn(
                  "gap-1.5 motion-base transition-transform hover:scale-[1.02] active:scale-[0.98]",
                  live && "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                )}
                onClick={actions.primary.onClick}
                disabled={actions.primary.loading}
              >
                {live ? <Zap className="size-4" /> : null}
                {actions.primary.loading ? "입장 중…" : actions.primary.label}
              </Button>
            )}
            {actions.secondary ? (
              <Button
                variant="outline"
                className="transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                onClick={actions.secondary.onClick}
                disabled={actions.secondary.loading}
              >
                {actions.secondary.loading ? "입장 중…" : actions.secondary.label}
              </Button>
            ) : null}
          </div>
        ) : !isComingSoon && !isMaintenance ? (
          <div className="mt-auto pt-1">
            <Button
              size="sm"
              className="w-full transition-transform duration-200 hover:scale-[1.01]"
              nativeButton={false}
              render={<Link href={`/games/${game.slug}`}>플레이</Link>}
            />
          </div>
        ) : (
          <div className="mt-auto pt-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              nativeButton={false}
              render={
                <Link href={`/games/${game.slug}`}>
                  {isMaintenance ? "점검 중" : "Coming Soon"}
                </Link>
              }
            />
          </div>
        )}
      </div>
    </article>
  );
}
