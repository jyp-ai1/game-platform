"use client";

import { EntryTracePanel } from "@/components/entry-trace-panel";
import { EntryCrashLog, loadEntryCrashLog } from "@game-platform/multiplayer-sdk";
import { SnakeEngineAuditPanel } from "@game-platform/game-snake";
import { cn } from "@game-platform/ui";
import { useCallback, useEffect, useState } from "react";

/** F2 toggle — fixed overlay, never affects game layout. Requires ?debug=1 on play page. */
export function SnakeDebugOverlay() {
  const [open, setOpen] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const crashCount = loadEntryCrashLog().length;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const copyCrashes = useCallback(async () => {
    const text = EntryCrashLog.export();
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("복사됨");
    } catch {
      setCopyMsg(text.slice(0, 120));
    }
    window.setTimeout(() => setCopyMsg(null), 2500);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto fixed bottom-3 right-3 z-[9998] rounded border border-white/10 bg-black/50 px-2 py-1 font-mono text-[10px] text-white/40 backdrop-blur-sm hover:text-white/70"
        aria-label="Open debug overlay (F2)"
      >
        F2
      </button>
    );
  }

  return (
    <div
      data-testid="snake-debug-overlay"
      className="pointer-events-auto fixed inset-y-3 right-3 z-[9999] flex w-[min(18rem,90vw)] flex-col gap-2 overflow-hidden"
    >
      <div className="flex items-center justify-between rounded-t-lg border border-violet-500/40 bg-black/90 px-2 py-1.5 backdrop-blur-md">
        <span className="font-mono text-[10px] font-bold text-violet-300">Debug (F2)</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded px-1.5 py-0.5 text-[10px] text-white/50 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className={cn("flex-1 space-y-2 overflow-y-auto rounded-b-lg border border-white/10 bg-black/85 p-2 backdrop-blur-md")}>
        <EntryTracePanel />
        <SnakeEngineAuditPanel />
        {crashCount > 0 ? (
          <div className="rounded border border-white/10 px-2 py-1.5 font-mono text-[10px]">
            <button type="button" onClick={copyCrashes} className="text-sky-300 hover:underline">
              최근 오류 복사 ({crashCount})
            </button>
            {copyMsg ? <p className="mt-1 text-white/50">{copyMsg}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
