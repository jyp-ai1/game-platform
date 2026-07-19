"use client";

import { playClickSound, playHoverSound } from "@game-platform/game-sdk";
import Link from "next/link";
import type { ComponentProps } from "react";

import { LinkPendingIndicator } from "@/components/link-pending-indicator";

/**
 * A <Link> to a game's play page with sound-effect hooks and the pending
 * navigation indicator built in. Pulled out as its own client component so
 * GameCard (a server component) doesn't have to become client-only just to
 * attach onClick/onMouseEnter handlers.
 */
export function GameCardPlayLink({
  indicatorClassName,
  children,
  ...linkProps
}: ComponentProps<typeof Link> & { indicatorClassName?: string }) {
  return (
    <Link {...linkProps} onMouseEnter={playHoverSound} onClick={playClickSound}>
      {children}
      <LinkPendingIndicator className={indicatorClassName} />
    </Link>
  );
}
