"use client";

import type { AgarPlayer } from "./agar-io-engine";
import { cameraFocus, totalMass } from "./agar-io-engine";

type TopRank = { id: string; rank: number };

/**
 * Agar minimap — YOU when alive (restore on respawn, hide when dead),
 * TOP10 numeric markers. Display-only; beside play area via MP shell sideHud.
 */
export function AgarMinimap({
  players,
  worldSize,
  selfId,
  topRanks,
  viewSize,
  compact = false,
}: {
  players: AgarPlayer[];
  worldSize: number;
  selfId: string;
  topRanks: TopRank[];
  viewSize: number;
  compact?: boolean;
}) {
  const me = players.find((p) => p.id === selfId);
  const youAlive = !!(me?.alive && me.cells.length > 0);
  const cam = cameraFocus(me);
  const rankById = new Map(topRanks.map((r) => [r.id, r.rank]));
  const youRank = rankById.get(selfId);
  const youCell = me?.cells[0];
  const youLeft = youCell ? `${(youCell.x / worldSize) * 100}%` : "50%";
  const youTop = youCell ? `${(youCell.y / worldSize) * 100}%` : "50%";

  const viewLeft = Math.max(0, Math.min(100, ((cam.x - viewSize / 2) / worldSize) * 100));
  const viewTop = Math.max(0, Math.min(100, ((cam.y - viewSize / 2) / worldSize) * 100));
  const viewW = Math.min(100 - viewLeft, (viewSize / worldSize) * 100);
  const viewH = Math.min(100 - viewTop, (viewSize / worldSize) * 100);

  const top1Id = topRanks[0]?.id ?? null;

  return (
    <div
      className={
        compact
          ? "w-full max-w-[6rem] shrink-0 rounded-lg border border-white/15 bg-black/50 p-1.5"
          : "mt-2 w-full shrink-0 rounded-lg border border-white/15 bg-black/50 p-2"
      }
    >
      <p
        className={
          compact
            ? "mb-0.5 text-[7px] font-semibold uppercase tracking-wide text-muted-foreground"
            : "mb-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground"
        }
      >
        Minimap
      </p>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/30">
        <div
          className="pointer-events-none absolute border border-white/40 bg-white/5"
          style={{
            left: `${viewLeft}%`,
            top: `${viewTop}%`,
            width: `${viewW}%`,
            height: `${viewH}%`,
          }}
        />
        {players.map((p) => {
          if (p.id === selfId || !p.alive || p.cells.length === 0) return null;
          const c = p.cells[0]!;
          const rank = rankById.get(p.id);
          const isTop1 = p.id === top1Id;
          const left = `${(c.x / worldSize) * 100}%`;
          const top = `${(c.y / worldSize) * 100}%`;
          const color = isTop1 ? "#eab308" : p.isBot ? "#9ca3af" : "#3b82f6";
          return (
            <div
              key={p.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
              title={`${p.nickname} L:${Math.round(totalMass(p))}`}
            >
              <div
                className="rounded-full"
                style={{
                  width: isTop1 ? 6 : 4,
                  height: isTop1 ? 6 : 4,
                  backgroundColor: color,
                  boxShadow: isTop1 ? "0 0 4px #eab308" : undefined,
                }}
              />
              {rank != null && rank <= 10 ? (
                <span
                  className={
                    compact
                      ? "absolute left-1/2 top-full -translate-x-1/2 text-[7px] font-bold leading-none text-white/80"
                      : "absolute left-1/2 top-full -translate-x-1/2 text-[8px] font-bold leading-none text-white/80"
                  }
                >
                  {rank}
                </span>
              ) : null}
            </div>
          );
        })}
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: youLeft,
            top: youTop,
            opacity: youAlive ? 1 : 0,
            visibility: youAlive ? "visible" : "hidden",
            pointerEvents: "none",
          }}
          title="You"
          aria-hidden={!youAlive}
        >
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] leading-none text-yellow-200">
            ★
          </span>
          <div
            className="rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_10px_#22c55e]"
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
