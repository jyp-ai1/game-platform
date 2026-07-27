"use client";

import { playClickSound } from "@game-platform/game-sdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

import { LinkPendingIndicator } from "@/components/link-pending-indicator";
import { enterSnakeQuickPlay, isSnakeQuickPlayHref } from "@/lib/snake-entry";

/**
 * A <Link> to a game's play page with a click sound and the pending
 * navigation indicator built in. Pulled out as its own client component so
 * GameCard (a server component) doesn't have to become client-only just to
 * attach an onClick handler.
 */
export function GameCardPlayLink({
  indicatorClassName,
  children,
  href,
  onClick,
  ...linkProps
}: ComponentProps<typeof Link> & { indicatorClassName?: string }) {
  const router = useRouter();
  const hrefStr = typeof href === "string" ? href : (href?.pathname ?? "");

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    playClickSound();
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (isSnakeQuickPlayHref(hrefStr)) {
      e.preventDefault();
      void enterSnakeQuickPlay(router);
    }
  };

  return (
    <Link {...linkProps} href={href} onClick={handleClick}>
      {children}
      <LinkPendingIndicator className={indicatorClassName} />
    </Link>
  );
}
