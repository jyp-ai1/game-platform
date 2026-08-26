"use client";

import { cn } from "@game-platform/ui";

export interface SnakeWorldHudProps {
  roomCode: string;
  /** Always WORLD for global shards (Preview evidence). */
  mode?: "WORLD" | "PRACTICE" | "STAGE";
  /** INVITE | QUICK — must match character-for-character PC ↔ Mobile. */
  source?: "INVITE" | "QUICK";
  players: number;
  bots: number;
  pingMs: number | null;
  fps: number;
  tickHz: number;
  isHost: boolean;
  className?: string;
}

/** WORLD debug HUD — room sync, latency, sim tick (Sprint 15.2) + MP-INVITE evidence */
export function SnakeWorldHud({
  roomCode,
  mode = "WORLD",
  source = "QUICK",
  players,
  bots,
  pingMs,
  fps,
  tickHz,
  isHost,
  className,
}: SnakeWorldHudProps) {
  return (
    <div
      className={cn(
        "pointer-events-none rounded-lg border border-emerald-400/25 bg-black/70 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-white/90 backdrop-blur-sm",
        className
      )}
      data-testid="snake-room-evidence"
    >
      <p className="mb-1 font-bold tracking-widest text-emerald-300">WORLD</p>
      <p className="mb-0.5 text-[11px] font-bold tracking-wide text-amber-300" data-testid="snake-room-label">
        ROOM: {roomCode}
      </p>
      <p className="mb-0.5 text-[11px] font-bold tracking-wide text-sky-300" data-testid="snake-mode-label">
        MODE: {mode}
      </p>
      <p className="mb-1 text-[11px] font-bold tracking-wide text-violet-300" data-testid="snake-source-label">
        SOURCE: {source}
      </p>
      <p>
        Players <span className="text-sky-300">{players}</span>
      </p>
      <p>
        Bots <span className="text-white/70">{bots}</span>
      </p>
      <p>
        Ping{" "}
        <span className={pingMs != null && pingMs < 80 ? "text-emerald-300" : "text-amber-300"}>
          {pingMs != null ? `${pingMs}ms` : "—"}
        </span>
      </p>
      <p>
        FPS <span className="text-violet-300">{fps}</span>
      </p>
      <p>
        Tick <span className="text-white/80">{tickHz}</span>
      </p>
      {isHost ? (
        <p className="mt-1 text-[9px] font-semibold text-amber-300/90">HOST</p>
      ) : null}
    </div>
  );
}
