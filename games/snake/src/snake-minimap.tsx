"use client";

import { cn } from "@game-platform/ui";

import type { SnakeEntity } from "./snake-io-engine";

interface SnakeMinimapProps {
  snakes: SnakeEntity[];
  worldSize: number;
  deviceId: string;
  top1Id: string | null;
  camX: number;
  camY: number;
  viewPx: number;
  cellSize: number;
}

/** Minimap — self highlight, TOP1 crown, viewport rect. No food dots. */
export function SnakeMinimap({
  snakes,
  worldSize,
  deviceId,
  top1Id,
  camX,
  camY,
  viewPx,
  cellSize,
}: SnakeMinimapProps) {
  const worldPx = worldSize * cellSize;
  const viewLeft = Math.max(0, Math.min(100, (camX / worldPx) * 100));
  const viewTop = Math.max(0, Math.min(100, (camY / worldPx) * 100));
  const viewW = Math.min(100 - viewLeft, (viewPx / worldPx) * 100);
  const viewH = Math.min(100 - viewTop, (viewPx / worldPx) * 100);

  return (
    <div className="hidden w-28 shrink-0 rounded-xl border border-white/15 bg-black/50 p-1.5 sm:block">
      <p className="mb-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">Minimap</p>
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
          const head = s.segments[0];
          if (!head || !s.alive) return null;
          const isMe = s.deviceId === deviceId;
          const isTop1 = s.deviceId === top1Id;
          const left = `${(head.x / worldSize) * 100}%`;
          const top = `${(head.y / worldSize) * 100}%`;
          if (isMe) {
            return (
              <div
                key={s.deviceId}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-white bg-blue-500 shadow-[0_0_6px_#3b82f6]"
                style={{ left, top, width: 8, height: 8 }}
                title="You"
              />
            );
          }
          if (isTop1) {
            return (
              <span
                key={s.deviceId}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[9px] leading-none"
                style={{ left, top }}
                title={s.nickname}
              >
                👑
              </span>
            );
          }
          return (
            <div
              key={s.deviceId}
              className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80")}
              style={{
                left,
                top,
                width: 4,
                height: 4,
                backgroundColor: s.color,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
