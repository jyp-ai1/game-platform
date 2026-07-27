"use client";

import {
  getEntryStatusSnapshot,
  subscribeEntryStatus,
  type TraceStep,
} from "@game-platform/game-snake";
import { useSyncExternalStore } from "react";

function stepLabel(step: TraceStep): string {
  const status =
    step.status === "ok"
      ? "OK"
      : step.status === "fail"
        ? "FAIL"
        : step.status === "running"
          ? "…"
          : "—";
  const detail = step.detail ? ` (${step.detail})` : "";
  const ms = step.ms != null ? ` ${step.ms}ms` : "";
  return `${step.id} ${status}${detail}${ms}`;
}

/** On-screen ENTRY trace — visible during play for PM/debug verification. */
export function EntryTracePanel({ compact = false }: { compact?: boolean }) {
  const status = useSyncExternalStore(
    subscribeEntryStatus,
    getEntryStatusSnapshot,
    getEntryStatusSnapshot
  );

  if (compact && status.gameReady) return null;

  return (
    <div
      data-testid="entry-trace-panel"
      className="mx-auto mt-2 w-full max-w-md rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-200/90 backdrop-blur-sm"
      aria-live="polite"
    >
      <p className="font-semibold text-emerald-300">{status.headline}</p>
      <ul className="mt-1 space-y-0.5">
        {status.steps.map((step) => (
          <li
            key={step.id}
            className={
              step.status === "fail"
                ? "text-red-400"
                : step.status === "ok"
                  ? "text-emerald-400/80"
                  : step.status === "running"
                    ? "text-amber-300"
                    : "text-muted-foreground/60"
            }
          >
            {stepLabel(step)}
          </li>
        ))}
      </ul>
      {status.lifecycle.length > 0 ? (
        <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2 text-[10px] text-violet-300/90">
          {status.lifecycle.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {status.gameReadyCount > 1 ? (
        <p className="mt-2 text-red-400">GAME_READY fired {status.gameReadyCount}x — remount bug</p>
      ) : null}
      {status.joinDebug ? (
        <div
          data-testid="join-room-debug"
          className="mt-2 border-t border-white/10 pt-2 text-[10px] text-sky-300/90"
        >
          <p>joinRoom: {status.joinDebug.returned ? "room" : "null"}</p>
          <p>room={status.joinDebug.roomCode}</p>
          {status.joinDebug.playerId ? <p>player={status.joinDebug.playerId.slice(0, 8)}…</p> : null}
          {status.joinDebug.playerCount != null ? (
            <p>players={status.joinDebug.playerCount}</p>
          ) : null}
          {status.joinDebug.transport ? <p>transport={status.joinDebug.transport}</p> : null}
          {status.joinDebug.error ? (
            <p className="text-red-400">{status.joinDebug.error}</p>
          ) : null}
        </div>
      ) : null}
      {status.lastError && status.failedStep ? (
        <p className="mt-2 text-red-400">
          {String(status.failedStep)} FAIL — {status.lastError}
        </p>
      ) : null}
    </div>
  );
}
