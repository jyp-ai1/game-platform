"use client";

import { GameErrorMonitor } from "@/components/game-error-monitor";
import { ViralLoopResultPanel } from "@/components/viral-loop-result";
import { GameSDKProvider } from "@game-platform/game-sdk";
import { rematchTogether, type ViralLoopResult } from "@game-platform/replay-engine/social";
import { entryLog, entryLogFail } from "@game-platform/game-snake";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Component, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";

import { submitScore as submitScoreRpc } from "@/lib/supabase/scores";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";

const SnakeIoGame = dynamic(
  () => import("@game-platform/game-snake").then((mod) => mod.SnakeIoGame),
  {
    ssr: false,
    loading: () => <p className="text-center text-muted-foreground">Loading game…</p>,
  }
);

async function submitScore(
  gameSlug: string,
  nickname: string,
  score: number,
  deviceId: string
): Promise<void> {
  await submitScoreRpc(gameSlug, nickname, score, deviceId);
  const { emitLiveScoreUpdate } = await import("@/lib/live-data-bus");
  emitLiveScoreUpdate(gameSlug, score);
  trackAnalyticsEvent("ranking_submit", {
    gameSlug,
    deviceId,
    metadata: { score, nickname },
  }).catch(() => {});
}

class SnakePlayErrorBoundary extends Component<
  { children: ReactNode; onPracticeFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    entryLogFail("RENDER", error.message);
    this.props.onPracticeFallback();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <p className="text-center text-sm text-muted-foreground">
          Connecting to Practice Mode…
        </p>
      );
    }
    return this.props.children;
  }
}

function SnakeIoPlayInner({ practiceMode = false }: { practiceMode?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const room = params.get("room");
  const [loop, setLoop] = useState<ViralLoopResult | null>(null);

  useEffect(() => {
    entryLog("PLAY_MOUNTED", practiceMode ? "PRACTICE" : room ?? "no-room");
    entryLog("ROUTE", typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
  }, [practiceMode, room]);

  useEffect(() => {
    function onEnd(e: Event) {
      const detail = (e as CustomEvent<ViralLoopResult>).detail;
      if (detail) setLoop(detail);
    }
    window.addEventListener("replay:viral-loop-complete", onEnd);
    return () => window.removeEventListener("replay:viral-loop-complete", onEnd);
  }, []);

  const goPractice = useCallback(() => {
    entryLog("PRACTICE_FALLBACK");
    router.replace("/flagship/snake-io/play?room=PRACTICE");
  }, [router]);

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

  return (
    <SnakePlayErrorBoundary onPracticeFallback={goPractice}>
      <SnakeIoGame practiceMode={practiceMode} onJoinTimeout={goPractice} />
    </SnakePlayErrorBoundary>
  );
}

/** Snake.io play — SDK wrapper, SSR off, practice fallback. */
export function SnakeIoPlayClient() {
  const params = useSearchParams();
  const practiceMode = params.get("room")?.toUpperCase() === "PRACTICE";

  return (
    <GameSDKProvider sdk={{ submitScore }}>
      <GameErrorMonitor gameSlug="snake" />
      <SnakeIoPlayInner practiceMode={practiceMode} />
    </GameSDKProvider>
  );
}

export function SnakeIoPlayClientRoot() {
  return (
    <Suspense fallback={<p className="text-center text-muted-foreground">Loading…</p>}>
      <SnakeIoPlayClient />
    </Suspense>
  );
}
