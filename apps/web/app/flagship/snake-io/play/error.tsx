"use client";

import { entryLog, entryLogFail } from "@game-platform/game-snake";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    <p className="py-16 text-center text-sm text-muted-foreground">
      Practice Mode로 전환 중…
    </p>
  );
}
