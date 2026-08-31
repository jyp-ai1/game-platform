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
  /** When player is alive but outside TOP10 — e.g. #14 L:153 */
  selfOutsideTop10?: { rank: number; length: number } | null;
  title?: string;
  compact?: boolean;
  className?: string;
}

/** TOP 10 ranking — sidebar (desktop) or strip (mobile). Never overlays the play field. */
export function SnakeRankingPanel({
  entries,
  deviceId,
  selfOutsideTop10 = null,
  title = "TOP 10",
  compact = false,
  className,
}: SnakeRankingPanelProps) {
  return (
    <div
      data-testid="mp-top10"
      className={cn(
        "touch-none select-none rounded-xl border border-white/15 bg-black/55 backdrop-blur-sm",
        compact ? "px-2 py-1.5 text-[9px]" : "px-3 py-2 text-[10px]",
        className
      )}
      style={{ WebkitUserSelect: "none", userSelect: "none", touchAction: "none" }}
    >
      <p className={cn("font-semibold text-amber-300", compact ? "mb-0.5" : "mb-1")}>{title}</p>
      <ol className={cn("space-y-0.5", compact && "grid grid-cols-2 gap-x-2 gap-y-0.5")}>
        {entries.slice(0, 10).map((r, i) => {
          const isSelf = r.deviceId === deviceId;
          return (
            <li
              key={r.deviceId}
              className={cn(
                "truncate",
                isSelf
                  ? "rounded-sm bg-emerald-500/20 font-bold text-emerald-200 ring-1 ring-emerald-400/50"
                  : "text-white/75"
              )}
            >
              {isSelf ? "★ " : ""}
              {i + 1}. {r.nickname.length > 8 ? `${r.nickname.slice(0, 7)}…` : r.nickname}{" "}
              <span className={cn(isSelf ? "text-emerald-100" : "text-white/70")}>L:{r.length}</span>
            </li>
          );
        })}
      </ol>
      {selfOutsideTop10 ? (
        <p
          className={cn(
            "mt-1 truncate rounded-sm bg-emerald-500/20 font-bold text-emerald-200 ring-1 ring-emerald-400/50",
            compact ? "pt-0.5 text-[9px]" : "pt-1 text-[10px]"
          )}
        >
          ★ #{selfOutsideTop10.rank} L:{selfOutsideTop10.length}
        </p>
      ) : null}
    </div>
  );
}
