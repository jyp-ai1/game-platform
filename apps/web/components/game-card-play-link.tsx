"use client";

import { playClickSound } from "@game-platform/game-sdk";
import Link from "next/link";
import type { ComponentProps } from "react";

import { LinkPendingIndicator } from "@/components/link-pending-indicator";

/**
 * A <Link> to a game's play page with a click sound and the pending
 * navigation indicator built in. Pulled out as its own client component so
 * GameCard (a server component) doesn't have to become client-only just to
 * attach an onClick handler.
 *
 * No hover sound: it would fire on every mouse pass over a grid of dozens
 * of cards, which is both noisy and (per Lighthouse) meaningfully more
 * event-listener overhead than a single discrete click across that many
 * instances — and PRD Task7 scopes sound to the "게임 시작 버튼", not the
 * whole card surface.
 */
export function GameCardPlayLink({
  indicatorClassName,
  children,
  ...linkProps
}: ComponentProps<typeof Link> & { indicatorClassName?: string }) {
  return (
    <Link {...linkProps} onClick={playClickSound}>
      {children}
      <LinkPendingIndicator className={indicatorClassName} />
    </Link>
  );
}
