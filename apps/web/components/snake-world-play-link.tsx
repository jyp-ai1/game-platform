"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { playHrefForCatalogSlug } from "@/lib/game-catalog";
import { invitePlayPath, readPinnedRoom } from "@/lib/invite-link";

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
    const pinned = readPinnedRoom(slug);
    if (!pinned) return;
    setHref(invitePlayPath(slug, pinned));
  }, [slug]);

  return (
    <Link href={href} data-testid={testId} className={className}>
      {children}
    </Link>
  );
}
