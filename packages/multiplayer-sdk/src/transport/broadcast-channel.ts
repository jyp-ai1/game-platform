/**
 * BroadcastChannel transport — cross-tab sync (step toward cross-device).
 * Falls back to localStorage transport for same-tab persistence.
 * Supabase Realtime: see ADR-003 (next phase when env configured).
 */
import type { GameRoom } from "@game-platform/shared";

import { memoryTransport } from "./memory";
import type { MultiplayerTransport } from "./interface";

const CHANNEL = "replay:rooms";

function broadcast(room: GameRoom): void {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type: "room-update", code: room.code, room });
    bc.close();
  } catch { /* ignore */ }
}

function wrap(base: MultiplayerTransport): MultiplayerTransport {
  const wrapped: MultiplayerTransport = {
    createRoom: (p) => {
      const room = base.createRoom(p);
      broadcast(room);
      return room;
    },
    joinRoom: (c, o) => {
      const room = base.joinRoom(c, o);
      if (room) broadcast(room);
      return room;
    },
    leaveRoom: (c) => base.leaveRoom(c),
    getRoom: (c) => base.getRoom(c),
    setPlayerReady: (c, r) => {
      const room = base.setPlayerReady(c, r);
      if (room) broadcast(room);
      return room;
    },
    send: (c, e, p) => {
      const room = base.send(c, e, p);
      if (room) broadcast(room);
      return room;
    },
    sync: (c) => base.sync(c),
    start: (c) => {
      const room = base.start(c);
      if (room) broadcast(room);
      return room;
    },
    finish: (c, r) => {
      const room = base.finish(c, r);
      if (room) broadcast(room);
      return room;
    },
    joinAsSpectator: (c) => {
      const room = base.joinAsSpectator(c);
      if (room) broadcast(room);
      return room;
    },
    reconnect: (c, t) => base.reconnect(c, t),
    tickCountdown: (c) => {
      const room = base.tickCountdown(c);
      if (room) broadcast(room);
      return room;
    },
    subscribe: (code, listener) => {
      const unsubLocal = base.subscribe(code, listener);
      if (typeof BroadcastChannel === "undefined") return unsubLocal;
      const bc = new BroadcastChannel(CHANNEL);
      const handler = (ev: MessageEvent) => {
        const data = ev.data as { type: string; code: string; room: GameRoom };
        if (data?.type === "room-update" && data.code.toUpperCase() === code.toUpperCase()) {
          listener(data.room);
        }
      };
      bc.addEventListener("message", handler);
      return () => {
        unsubLocal();
        bc.removeEventListener("message", handler);
        bc.close();
      };
    },
  };
  return wrapped;
}

/** Cross-tab realtime bridge — memory + BroadcastChannel (dev fallback). */
export const broadcastChannelTransport: MultiplayerTransport = wrap(memoryTransport);

/** Check if Supabase Realtime should be used (future). */
export function isSupabaseRealtimeAvailable(): boolean {
  return typeof process !== "undefined" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
