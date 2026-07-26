"use client";

import { ViralLoopResultPanel } from "@/components/viral-loop-result";
import { SnakeIoGame } from "@game-platform/game-snake";
import { rematchTogether, type ViralLoopResult } from "@game-platform/replay-engine/social";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Snake.io play — viral loop result overlay. */
export function SnakeIoPlayClient() {
  const router = useRouter();
  const [loop, setLoop] = useState<ViralLoopResult | null>(null);

  useEffect(() => {
    function onEnd(e: Event) {
      const detail = (e as CustomEvent<ViralLoopResult>).detail;
      if (detail) setLoop(detail);
    }
    window.addEventListener("replay:viral-loop-complete", onEnd);
    return () => window.removeEventListener("replay:viral-loop-complete", onEnd);
  }, []);

  const handleRematch = useCallback(async () => {
    if (!loop) return;
    if (loop.partyId) {
      const r = await rematchTogether(loop.partyId, loop.result.gameSlug);
      if (r) {
        router.push(`/flagship/snake-io/play?room=${r.roomCode}`);
        setLoop(null);
        return;
      }
    }
    router.push(`/flagship/snake-io/play?room=${loop.result.roomCode}`);
    setLoop(null);
  }, [loop, router]);

  if (loop) {
    return <ViralLoopResultPanel loop={loop} onRematch={handleRematch} />;
  }

  return <SnakeIoGame />;
}
