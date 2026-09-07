"use client";

import { entryLogFail } from "@game-platform/game-snake";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EntryTracePanel } from "@/components/entry-trace-panel";

/** Play route — show connection failure with Retry/Back (no practice disguise). */
export default function SnakePlayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    entryLogFail("RENDER", error.message, {
      room: new URLSearchParams(window.location.search).get("room") ?? undefined,
    });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 py-16">
      <EntryTracePanel />
      <p className="text-lg font-semibold text-red-200">Connection failed</p>
      <p className="max-w-sm text-center text-sm text-muted-foreground">
        Could not load the multiplayer world.
      </p>
      <p className="max-w-sm text-center font-mono text-xs text-red-400">{error.message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          data-testid="snake-connect-retry"
          onClick={() => reset()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
        >
          Retry
        </button>
        <button
          type="button"
          data-testid="snake-connect-back"
          onClick={() => router.push("/games/snake")}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to game
        </button>
      </div>
    </div>
  );
}
