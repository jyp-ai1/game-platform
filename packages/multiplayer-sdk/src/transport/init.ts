/**
 * Transport bootstrap — Supabase Realtime when configured, memory fallback for tests.
 */
import type { MultiplayerTransport } from "./interface";
import { broadcastChannelTransport } from "./broadcast-channel";
import { memoryTransport } from "./memory";
import { isSupabaseRealtimeConfigured } from "./supabase-client";
import { supabaseTransport } from "./supabase";

let activeTransport: MultiplayerTransport | null = null;

export function resolveTransport(): MultiplayerTransport {
  if (activeTransport) return activeTransport;
  if (isSupabaseRealtimeConfigured()) {
    activeTransport = supabaseTransport;
  } else if (typeof BroadcastChannel !== "undefined") {
    activeTransport = broadcastChannelTransport;
  } else {
    activeTransport = memoryTransport;
  }
  return activeTransport;
}

export function setMultiplayerTransport(transport: MultiplayerTransport): void {
  activeTransport = transport;
}

export function getMultiplayerTransport(): MultiplayerTransport {
  return resolveTransport();
}

export function initMultiplayerTransport(): MultiplayerTransport {
  return resolveTransport();
}
