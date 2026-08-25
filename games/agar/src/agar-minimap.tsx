"use client";

import { MultiplayerMinimap, type MpMinimapDot } from "@game-platform/game-sdk";

import type { AgarPlayer } from "./agar-io-engine";
import { cameraFocus, totalMass } from "./agar-io-engine";

type TopRank = { id: string; rank: number };

/**
 * Agar minimap — thin adapter over shared MultiplayerMinimap.
 * YOU ★ when alive; TOP10 markers. Display-only.
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
  const top1Id = topRanks[0]?.id ?? null;
  const youCell = me?.cells[0];

  const dots: MpMinimapDot[] = players
    .filter((p) => p.alive && p.cells.length > 0)
    .map((p) => {
      const c = p.cells[0]!;
      const isSelf = p.id === selfId;
      return {
        id: p.id,
        x: c.x / worldSize,
        y: c.y / worldSize,
        kind: isSelf
          ? ("self" as const)
          : p.id === top1Id
            ? ("leader" as const)
            : p.isBot
              ? ("bot" as const)
              : ("human" as const),
        rank: rankById.get(p.id),
        alive: isSelf ? youAlive : true,
        title: `${p.nickname} L:${Math.round(totalMass(p))}`,
      };
    });

  if (me && !dots.some((d) => d.id === selfId)) {
    dots.push({
      id: selfId,
      x: (youCell?.x ?? cam.x) / worldSize,
      y: (youCell?.y ?? cam.y) / worldSize,
      kind: "self",
      rank: rankById.get(selfId),
      alive: false,
    });
  }

  const viewLeft = Math.max(0, Math.min(100, ((cam.x - viewSize / 2) / worldSize) * 100));
  const viewTop = Math.max(0, Math.min(100, ((cam.y - viewSize / 2) / worldSize) * 100));
  const viewW = Math.min(100 - viewLeft, (viewSize / worldSize) * 100);
  const viewH = Math.min(100 - viewTop, (viewSize / worldSize) * 100);

  return (
    <MultiplayerMinimap
      dots={dots}
      compact={compact}
      viewRect={{ left: viewLeft, top: viewTop, width: viewW, height: viewH }}
    />
  );
}
