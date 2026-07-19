"use client";

import { useLinkStatus } from "next/link";

import { cn } from "@game-platform/ui";

/**
 * Renders inside a <Link> to show a spinner while that specific navigation
 * is in flight. Avoids route-level loading.tsx entirely — that mechanism
 * was found to leave a stuck Suspense fallback on this Next.js/Turbopack
 * version (verified: removing loading.tsx is what fixes it).
 */
export function LinkPendingIndicator({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <span
      role="status"
      aria-label="이동 중"
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px]",
        className
      )}
    >
      <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </span>
  );
}
