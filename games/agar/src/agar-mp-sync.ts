import type { AgarWorld } from "./agar-io-engine";
import { respawnPlayer } from "./agar-io-engine";

export type AgarPeerPose = {
  deviceId: string;
  nickname: string;
  color: string;
  alive: boolean;
  cells: { x: number; y: number; mass: number }[];
  aimX: number;
  aimY: number;
  tick: number;
  at: number;
};

export function buildPeerPose(world: AgarWorld, deviceId: string): AgarPeerPose | null {
  const p = world.players[deviceId];
  if (!p) return null;
  return {
    deviceId,
    nickname: p.nickname,
    color: p.color,
    alive: p.alive,
    cells: p.cells.map((c) => ({ x: c.x, y: c.y, mass: c.mass })),
    aimX: p.aimX,
    aimY: p.aimY,
    tick: world.tick,
    at: Date.now(),
  };
}

export function applyPeerPose(world: AgarWorld, pose: AgarPeerPose): void {
  if (!pose.deviceId) return;
  let p = world.players[pose.deviceId];
  if (!p?.alive && pose.alive) {
    respawnPlayer(world, pose.deviceId, pose.nickname);
    p = world.players[pose.deviceId];
  }
  if (!p) return;
  p.isBot = false;
  p.networkRemote = true;
  p.nickname = pose.nickname || p.nickname;
  p.color = pose.color || p.color;
  p.alive = pose.alive;
  p.aimX = pose.aimX;
  p.aimY = pose.aimY;
  if (pose.cells.length > 0) {
    p.cells = pose.cells.map((c) => ({ ...c }));
  }
}
