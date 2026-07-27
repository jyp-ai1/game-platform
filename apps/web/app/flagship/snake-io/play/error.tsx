"use client";

import { entryLog, entryLogFail } from "@game-platform/game-snake";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EntryTracePanel } from "@/components/entry-trace-panel";

/** Play route — never show global error page; redirect to Practice. */
export default function SnakePlayError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    entryLogFail("RENDER", error.message, {
      room: new URLSearchParams(window.location.search).get("room") ?? undefined,
    });
    entryLog("PRACTICE_FALLBACK", "play-error.tsx");
    router.replace("/flagship/snake-io/play?room=PRACTICE&fallback=1");
  }, [error, router]);

  return (
    <div className="flex flex-col items-center gap-2 py-16">
      <EntryTracePanel />
      <p className="text-center text-sm text-muted-foreground">Practice Mode로 전환 중…</p>
      <p className="max-w-sm text-center font-mono text-xs text-red-400">{error.message}</p>
    </div>
  );
}
