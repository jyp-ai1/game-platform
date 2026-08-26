"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const ACTIVE_ROOM_KEY = "play29:active-room";

/** Concrete WORLD-* only — bare WORLD re-resolves per client and splits invite rooms. */
function readPinnedSnakeRoom(): string | null {
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
  const [href, setHref] = useState("/flagship/snake-io/play?room=WORLD");

  useEffect(() => {
    const pinned = readPinnedSnakeRoom();
    if (pinned) {
      setHref(`/flagship/snake-io/play?room=${encodeURIComponent(pinned)}&source=invite`);
    }
  }, []);

  return (
    <Link href={href} data-testid={testId} className={className}>
      {children}
    </Link>
  );
}
