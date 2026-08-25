"use client";

import { cn } from "@game-platform/ui";

import { isBotSnake } from "./snake-ai-fill";
import type { SnakeEntity } from "./snake-io-engine";
import { resolveSnakeHead } from "./snake-mvp-rc1";

interface SnakeMinimapProps {
  snakes: SnakeEntity[];
  worldSize: number;
  deviceId: string;
  top1Id: string | null;
  /** Rank markers 1–10 from existing display rankings (no new calc). */
  topRanks?: { deviceId: string; rank: number }[];
  camX: number;
  camY: number;
  viewPx: number;
  cellSize: number;
  compact?: boolean;
  className?: string;
}

function validYouMarker(snake: SnakeEntity | undefined): { x: number; y: number } | null {
  // ONE condition: exists AND alive AND valid position (not spectating)
  if (!snake || !snake.alive || snake.spectating) return null;
  const head = resolveSnakeHead(snake);
  if (!head || !Number.isFinite(head.x) || !Number.isFinite(head.y)) return null;
  return head;
}

/** Minimap — self ★ green (alive only), leader yellow, human blue, bot gray + TOP10 #. */
export function SnakeMinimap({
  snakes,
  worldSize,
  deviceId,
  top1Id,
  topRanks = [],
  camX,
  camY,
  viewPx,
  cellSize,
  compact = false,
  className,
}: SnakeMinimapProps) {
  const worldPx = worldSize * cellSize;
  const viewLeft = Math.max(0, Math.min(100, (camX / worldPx) * 100));
  const viewTop = Math.max(0, Math.min(100, (camY / worldPx) * 100));
  const viewW = Math.min(100 - viewLeft, (viewPx / worldPx) * 100);
  const viewH = Math.min(100 - viewTop, (viewPx / worldPx) * 100);
  const rankById = new Map(topRanks.map((r) => [r.deviceId, r.rank]));

  const me = snakes.find((s) => s.deviceId === deviceId);
  const youHead = validYouMarker(me);
  const youRank = rankById.get(deviceId);
  const youLeft = youHead ? `${(youHead.x / worldSize) * 100}%` : "50%";
  const youTop = youHead ? `${(youHead.y / worldSize) * 100}%` : "50%";

  return (
    <div
      className={cn(
        "shrink-0 rounded-xl border border-white/15 bg-black/50 p-2",
        compact ? "w-full max-w-[6rem] p-1.5" : "w-full max-w-[9rem]",
        className
      )}
    >
      <p
        className={cn(
          "font-semibold uppercase tracking-wide text-muted-foreground",
          compact ? "mb-0.5 text-[7px]" : "mb-1 text-[8px]"
        )}
      >
        Minimap
      </p>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/30">
        <div
          className="pointer-events-none absolute border border-white/50 bg-white/5"
          style={{
            left: `${viewLeft}%`,
            top: `${viewTop}%`,
            width: `${viewW}%`,
            height: `${viewH}%`,
          }}
        />
        {snakes.map((s) => {
          if (s.deviceId === deviceId) return null;
          if (!s.alive || s.spectating) return null;
          const head = resolveSnakeHead(s);
          if (!head) return null;
          const isTop1 = s.deviceId === top1Id;
          const isBot = isBotSnake(s);
          const rank = rankById.get(s.deviceId);
          const left = `${(head.x / worldSize) * 100}%`;
          const top = `${(head.y / worldSize) * 100}%`;
          const dotColor = isTop1 ? "#eab308" : isBot ? "#9ca3af" : "#3b82f6";
          return (
            <div
              key={s.deviceId}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2",
                isTop1 || (rank != null && rank <= 10) ? "z-10" : "opacity-90"
              )}
              style={{ left, top }}
              title={s.nickname}
            >
              <div
                className="rounded-full"
                style={{
                  width: isTop1 ? 6 : 4,
                  height: isTop1 ? 6 : 4,
                  backgroundColor: dotColor,
                  boxShadow: isTop1 ? "0 0 4px #eab308" : undefined,
                }}
              />
              {rank != null && rank <= 10 ? (
                <span
                  className={cn(
                    "absolute left-1/2 top-full -translate-x-1/2 font-bold leading-none",
                    compact ? "text-[7px]" : "text-[8px]",
                    isTop1 ? "text-amber-200" : "text-white/80"
                  )}
                >
                  {rank}
                </span>
              ) : null}
            </div>
          );
        })}
        {/* Stable YOU marker — update position; hide via opacity (no create/destroy flicker) */}
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-none"
          style={{
            left: youLeft,
            top: youTop,
            opacity: youHead ? 1 : 0,
            pointerEvents: "none",
            visibility: youHead ? "visible" : "hidden",
          }}
          title="You"
          aria-hidden={!youHead}
        >
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] leading-none text-yellow-200">
            ★
          </span>
          <div
            className="rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_12px_#22c55e]"
            style={{ width: compact ? 10 : 12, height: compact ? 10 : 12 }}
          />
          {youRank != null && youRank <= 10 ? (
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-bold leading-none text-emerald-200">
              {youRank}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
