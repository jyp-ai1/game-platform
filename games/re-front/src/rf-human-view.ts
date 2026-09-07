/**
 * Guest/Host camera framing for human territory.
 * Display-only: does not change sync payload, bots, or economy.
 */

import { RF_CELL, nationCenter, type RfWorld } from "./re-front-engine";

export function humanViewTarget(world: RfWorld, localId: string): { cx: number; cy: number } | null {
  const local = nationCenter(world, localId);
  if (!local) return null;
  const others: Array<{ cx: number; cy: number }> = [];
  for (const n of Object.values(world.nations)) {
    if (!n.alive || n.isBot || n.id === localId) continue;
    const c = nationCenter(world, n.id);
    if (c) others.push(c);
  }
  if (!others.length) return local;
  const ox = others.reduce((s, c) => s + c.cx, 0) / others.length;
  const oy = others.reduce((s, c) => s + c.cy, 0) / others.length;
  return { cx: (local.cx + ox) / 2, cy: (local.cy + oy) / 2 };
}

export function isCellInView(
  cell: { cx: number; cy: number },
  cam: { x: number; y: number },
  viewW: number,
  viewH: number,
  zoom: number,
  pad = 8
): boolean {
  const cellPx = RF_CELL * zoom;
  const sx = viewW / 2 + (cell.cx - cam.x) * cellPx;
  const sy = viewH / 2 + (cell.cy - cam.y) * cellPx;
  return sx >= pad && sy >= pad && sx <= viewW - pad && sy <= viewH - pad;
}

export function humansVisibleInView(
  world: RfWorld,
  cam: { x: number; y: number },
  viewW: number,
  viewH: number,
  zoom: number
): boolean {
  const humans = Object.values(world.nations).filter((n) => n.alive && !n.isBot);
  if (!humans.length) return false;
  return humans.every((n) => {
    const c = nationCenter(world, n.id);
    return c ? isCellInView(c, cam, viewW, viewH, zoom) : false;
  });
}
