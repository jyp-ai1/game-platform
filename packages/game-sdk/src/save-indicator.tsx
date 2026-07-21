import type { SaveIndicatorStatus } from "./use-auto-save";

interface SaveIndicatorProps {
  status: SaveIndicatorStatus;
}

// Dumb presentational component — all timing logic (saving -> saved -> idle)
// lives in useAutoSave. Board-scoped (absolute, not fixed), top-right of the
// game area per spec; z-30 keeps it below ResumeDialog/GameOverOverlay.
export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute right-2 top-2 z-30 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur"
    >
      {status === "saving" ? "Saving..." : "Saved"}
    </div>
  );
}
