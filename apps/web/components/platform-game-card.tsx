"use client";

import type { Difficulty, Game } from "@game-platform/shared";
import { Button, cn } from "@game-platform/ui";
import { Gamepad2, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FavoriteButton } from "@/components/favorite-button";
import { GameCardPlayLink } from "@/components/game-card-play-link";
import { difficultyLabel, formatDifficulty } from "@/lib/difficulty";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/image-placeholder";
import { useLivePlayerCount } from "@/lib/use-live-player-count";
import { useMounted } from "@/lib/use-mounted";

/** Stable display rating for platform cards (no DB field yet). */
export function platformGameRating(_slug: string): string | null {
  return null;
}

function genreLabel(game: Game): string {
  if (game.slug === "snake" || game.slug === "agar" || game.slug === "bomber" || game.slug === "re-front") {
    return "실시간 멀티플레이";
  }
  if (game.tags.includes("multiplayer")) return "멀티플레이";
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
  summary,
  creator,
  detailHref,
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
  /** Optional one-line blurb for discovery grids. */
  summary?: string;
  creator?: string;
  /** When set, thumbnail + title link to game detail. */
  detailHref?: string;
  className?: string;
}) {
  const isComingSoon = game.status === "COMING_SOON";
  const isMaintenance = game.status === "MAINTENANCE";
  const mounted = useMounted();
  const basePlayers = live?.players ?? 0;
  const animatedPlayers = useLivePlayerCount(basePlayers, 5000);
  const playerCount =
    !mounted || live?.animatePlayers === false || !live ? basePlayers : animatedPlayers;
  const playerLabel = live ? `${playerCount} Players` : null;
  const diffBadge = difficultyBadgeVariant(game.difficulty);

  const cardDetailHref = detailHref ?? `/games/${game.slug}`;

  return (
    <article
      data-testid={hero ? "home-hero-card" : "platform-game-card"}
      className={cn(
        "group relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-md motion-base transition-all sm:min-h-[340px]",
        hero && "hover:scale-[1.01] hover:border-primary/30 hover:shadow-lg",
        !hero && "hover:border-primary/30 hover:shadow-lg",
        live && "border-emerald-500/35 shadow-emerald-500/10",
        className
      )}
    >
      {!isComingSoon && !isMaintenance ? (
        <Link
          href={cardDetailHref}
          aria-label={`${game.title} — 상세 보기`}
          className="absolute inset-0 z-[1] rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          tabIndex={-1}
        />
      ) : null}
      <div className="relative min-h-[160px] flex-[3] overflow-hidden bg-muted sm:min-h-[200px] lg:min-h-[240px]">
        {game.thumbnailUrl ? (
          <Image
            src={game.thumbnailUrl}
            alt={`${game.title} thumbnail`}
            fill
            unoptimized={game.thumbnailUrl.startsWith("/images/")}
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
          <FavoriteButton slug={game.slug} className="absolute left-2 top-2 z-20" />
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
      <div className="relative z-[2] flex flex-[2] flex-col gap-2 p-3 sm:p-4">
        <div>
          <h3 className="text-base font-bold leading-tight sm:text-lg">{game.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{genreLabel(game)}</p>
          {creator ? (
            <p
              data-testid="platform-game-card-creator"
              className="mt-1 text-[11px] text-muted-foreground/90 sm:text-xs"
            >
              by {creator}
            </p>
          ) : null}
          {summary ? (
            <p
              data-testid="platform-game-card-summary"
              className="mt-1.5 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm"
            >
              {summary}
            </p>
          ) : null}
          {!live && !isComingSoon && !isMaintenance ? (
            <div className="mt-2 flex flex-wrap gap-1">
              <PlatformBadge variant={diffBadge}>{difficultyLabel[game.difficulty]}</PlatformBadge>
              {isHot ? <PlatformBadge variant="hot">HOT</PlatformBadge> : null}
              {isNew ? <PlatformBadge variant="new">NEW</PlatformBadge> : null}
            </div>
          ) : null}
        </div>

        {live && playerLabel && mounted ? (
          <p className="text-xs text-emerald-400/90 tabular-nums">{playerLabel}</p>
        ) : null}

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
          <div
            className={cn(
              "relative z-20 mt-auto flex flex-wrap gap-2 pt-1",
              !actions.secondary && "flex-col"
            )}
          >
            {actions.primary.href ? (
              <Button
                className={cn(
                  "min-h-12 w-full gap-1.5 text-base font-bold motion-base transition-transform hover:scale-[1.02] active:scale-[0.98]",
                  live
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-400 text-emerald-950 hover:from-emerald-400 hover:to-cyan-300"
                    : "bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:from-violet-500 hover:to-cyan-400",
                  actions.secondary && "w-auto flex-1"
                )}
                nativeButton={false}
                render={
                  <GameCardPlayLink href={actions.primary.href}>
                    {live ? <Zap className="size-4" /> : null}
                    {actions.primary.label}
                  </GameCardPlayLink>
                }
              />
            ) : (
              <Button
                className={cn(
                  "min-h-12 w-full gap-1.5 text-base font-bold motion-base transition-transform hover:scale-[1.02] active:scale-[0.98]",
                  live
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-400 text-emerald-950 hover:from-emerald-400 hover:to-cyan-300"
                    : "bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:from-violet-500 hover:to-cyan-400",
                  actions.secondary && "w-auto flex-1"
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
              className="min-h-12 w-full bg-gradient-to-r from-violet-600 to-cyan-500 text-base font-bold text-white hover:from-violet-500 hover:to-cyan-400"
              nativeButton={false}
              render={<Link href={`/games/${game.slug}`}>▶ Re:Play</Link>}
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
