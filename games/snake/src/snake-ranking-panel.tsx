"use client";

import { cn } from "@game-platform/ui";

export interface SnakeRankingEntry {
  deviceId: string;
  nickname: string;
  length: number | string;
}

interface SnakeRankingPanelProps {
  entries: SnakeRankingEntry[];
  deviceId: string;
  title?: string;
  compact?: boolean;
  className?: string;
}

/** TOP 10 ranking — sidebar (desktop) or strip (mobile). Never overlays the play field. */
export function SnakeRankingPanel({
  entries,
  deviceId,
  title = "TOP 10",
  compact = false,
  className,
}: SnakeRankingPanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/15 bg-black/55 backdrop-blur-sm",
        compact ? "px-2 py-1.5 text-[9px]" : "px-3 py-2 text-[10px]",
        className
      )}
    >
      <p className={cn("font-semibold text-amber-300", compact ? "mb-0.5" : "mb-1")}>{title}</p>
      <ol className={cn("space-y-0.5", compact && "grid grid-cols-2 gap-x-2 gap-y-0.5")}>
        {entries.slice(0, 10).map((r, i) => (
          <li
            key={r.deviceId}
            className={cn(
              "truncate",
              r.deviceId === deviceId ? "font-bold text-emerald-300" : "text-white/75"
            )}
          >
            {i + 1}. {r.nickname.length > 8 ? `${r.nickname.slice(0, 7)}…` : r.nickname}{" "}
            <span className="text-white/50">L{r.length}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
