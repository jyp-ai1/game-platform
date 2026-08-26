"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { playHrefForCatalogSlug } from "@/lib/game-catalog";

const ACTIVE_ROOM_KEY = "play29:active-room";

/** Concrete WORLD-* only — bare WORLD re-resolves per client and splits invite rooms. */
function readPinnedWorldRoom(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const active = window.localStorage.getItem(ACTIVE_ROOM_KEY)?.toUpperCase() ?? null;
    if (active && /^WORLD-[A-Z0-9]+$/.test(active)) return active;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * WORLD PLAY CTA — if an invite/share already pinned a WORLD-* shard, join that room
 * instead of bare WORLD (cluster resolve → WORLD-2/3/4 split).
 * Snake path unchanged; Agar/Bomber reuse the same pin key.
 */
export function SnakeWorldPlayLink({
  className,
  children,
  "data-testid": testId,
}: {
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <MpWorldPlayLink slug="snake" className={className} data-testid={testId}>
      {children}
    </MpWorldPlayLink>
  );
}

export function MpWorldPlayLink({
  slug,
  className,
  children,
  "data-testid": testId,
}: {
  slug: "snake" | "agar" | "bomber";
  className?: string;
  children: ReactNode;
  "data-testid"?: string;
}) {
  const [href, setHref] = useState(() => playHrefForCatalogSlug(slug));

  useEffect(() => {
    const pinned = readPinnedWorldRoom();
    if (!pinned) return;
    if (slug === "snake") {
      setHref(`/flagship/snake-io/play?room=${encodeURIComponent(pinned)}&source=invite`);
      return;
    }
    setHref(`/games/${slug}/play?room=${encodeURIComponent(pinned)}&source=invite`);
  }, [slug]);

  return (
    <Link href={href} data-testid={testId} className={className}>
      {children}
    </Link>
  );
}
