"use client";

import { useEffect, useState } from "react";

import { getSaveUpdatedAt, subscribeSave } from "./save";
import type { SaveIndicatorStatus } from "./use-auto-save";

interface SaveIndicatorProps {
  status: SaveIndicatorStatus;
  slug: string;
}

function formatElapsed(updatedAt: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000)
  );
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전`;
}

// Board-scoped (absolute, not fixed), top-right of the game area per spec;
// z-30 keeps it below ResumeDialog/GameOverOverlay. "saving"/"saved" are
// transient (timing owned by useAutoSave); once that flash clears, this
// falls back to a persistent "저장됨 · n초 전" ticking off the save
// envelope's own updatedAt rather than disappearing entirely.
export function SaveIndicator({ status, slug }: SaveIndicatorProps) {
  const [updatedAt, setUpdatedAt] = useState<string | null>(() =>
    getSaveUpdatedAt(slug)
  );
  const [, forceTick] = useState(0);

  useEffect(() => {
    setUpdatedAt(getSaveUpdatedAt(slug));
    return subscribeSave(slug, () => setUpdatedAt(getSaveUpdatedAt(slug)));
  }, [slug]);

  // Only runs while the persistent "n초 전" label is actually showing --
  // the "saving"/"saved" flash is already transient and self-clearing.
  useEffect(() => {
    if (status !== "idle" || !updatedAt) {
      return;
    }
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [status, updatedAt]);

  let label: string | null = null;
  if (status === "saving") {
    label = "Saving...";
  } else if (status === "saved") {
    label = "Saved";
  } else if (updatedAt) {
    label = `저장됨 · ${formatElapsed(updatedAt)}`;
  }

  if (!label) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute right-2 top-2 z-30 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur"
    >
      {label}
    </div>
  );
}
