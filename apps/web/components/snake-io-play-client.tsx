"use client";

import { GameErrorMonitor } from "@/components/game-error-monitor";
import { prefetchHomeShell } from "@/components/home-page-client";
import { ViralLoopResultPanel } from "@/components/viral-loop-result";
import { GameSDKProvider, emitEngagementEvent } from "@game-platform/game-sdk";
import { rematchTogether, type ViralLoopResult } from "@game-platform/replay-engine/social";
import { entryLog, entryLogFail, entryTrace, resetEntryStatus, resetEngineSession } from "@game-platform/game-snake";
import { EntryCrashLog, loadEntryCrashLog } from "@game-platform/multiplayer-sdk";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { EntryTracePanel } from "@/components/entry-trace-panel";

import { submitScore as submitScoreRpc } from "@/lib/supabase/scores";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";
import { PRACTICE_URL } from "@/lib/snake-entry";

const PRACTICE_FALLBACK_MSG =
  "멀티플레이 연결이 지연되어 연습모드로 시작합니다.";

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
  { failed: boolean; errorMessage: string | null }
> {
  state = { failed: false, errorMessage: null as string | null };

  static getDerivedStateFromError(error: Error): { failed: boolean; errorMessage: string } {
    return { failed: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error): void {
    entryLogFail("RENDER", error.message, {
      room: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("room") ?? undefined : undefined,
    });
    this.props.onPracticeFallback();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <EntryTracePanel />
          <p className="text-sm text-amber-300">RENDER FAIL — Practice Mode로 전환 중…</p>
          {this.state.errorMessage ? (
            <p className="max-w-sm font-mono text-xs text-red-400">{this.state.errorMessage}</p>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

function SnakeIoPlayInner({ practiceMode = false }: { practiceMode?: boolean }) {
  const params = useSearchParams();
  const debugMode = params.get("debug") === "1";
  const router = useRouter();
  const room = params.get("room");
  const [loop, setLoop] = useState<ViralLoopResult | null>(null);

  useEffect(() => {
    resetEntryStatus();
    entryLog("PLAY_PAGE_MOUNT");
    return () => {
      entryLog("PLAY_PAGE_UNMOUNT");
      resetEngineSession();
    };
  }, []);

  useEffect(() => {
    if (room && !practiceMode) {
      entryTrace("CLICK", "PASS", "quick-play", 0);
      entryTrace("ROUTE", "PASS", `/flagship/snake-io/play?room=${room}`, 0);
    }
    entryTrace("PROVIDER_READY", "PASS");
    entryTrace("PLAY_MOUNTED", "PASS", practiceMode ? "PRACTICE" : room ?? "no-room");
    if (!practiceMode && room) entryTrace("ENTRY", "PASS", room);
    prefetchHomeShell();
    if (typeof window !== "undefined") {
      (window as Window & { EntryCrashLog?: typeof EntryCrashLog }).EntryCrashLog = EntryCrashLog;
    }
  }, [practiceMode, room]);

  useEffect(() => {
    if (practiceMode || room) return;
    entryLog("PRACTICE_FALLBACK", "no-room-param");
    router.replace(PRACTICE_URL);
  }, [practiceMode, room, router]);

  useEffect(() => {
    if (!practiceMode) return;
    const fallback = params.get("fallback");
    if (fallback === "1") {
      emitEngagementEvent({
        type: "practice-fallback",
        message: PRACTICE_FALLBACK_MSG,
      });
    }
  }, [practiceMode, params]);

  useEffect(() => {
    function onEnd(e: Event) {
      const detail = (e as CustomEvent<ViralLoopResult>).detail;
      if (detail) {
        entryTrace("REPLAY", "PASS", detail.result.gameSlug);
        setLoop(detail);
      }
    }
    window.addEventListener("replay:viral-loop-complete", onEnd);
    return () => window.removeEventListener("replay:viral-loop-complete", onEnd);
  }, []);

  const goPractice = useCallback(() => {
    entryLog("PRACTICE_FALLBACK");
    emitEngagementEvent({
      type: "practice-fallback",
      message: PRACTICE_FALLBACK_MSG,
    });
    router.replace(PRACTICE_URL);
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
    <>
      {debugMode ? <EntryTracePanel /> : null}
      <SnakePlayErrorBoundary onPracticeFallback={goPractice}>
        <SnakeIoGame practiceMode={practiceMode} onJoinTimeout={goPractice} />
        <EntryCrashReporter />
      </SnakePlayErrorBoundary>
    </>
  );
}

function EntryCrashReporter() {
  const [msg, setMsg] = useState<string | null>(null);
  const count = loadEntryCrashLog().length;
  const show =
    count > 0 ||
    (typeof window !== "undefined" && window.location.hostname.includes("vercel.app"));

  const copy = useCallback(async () => {
    const text = EntryCrashLog.export();
    try {
      await navigator.clipboard.writeText(text);
      setMsg("복사됨");
    } catch {
      setMsg(text.slice(0, 200));
    }
    setTimeout(() => setMsg(null), 3000);
  }, []);

  if (!show) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-1 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border border-white/15 px-3 py-1.5 hover:border-primary/40"
      >
        최근 오류 복사 {count > 0 ? `(${count})` : ""}
      </button>
      {msg ? <span>{msg}</span> : null}
    </div>
  );
}

/** Snake.io play — SDK wrapper, SSR off, practice fallback. */
export function SnakeIoPlayClient() {
  const params = useSearchParams();
  const practiceMode = params.get("room")?.toUpperCase() === "PRACTICE";
  const sdk = useMemo(() => ({ submitScore }), []);

  useEffect(() => {
    entryLog("PROVIDER_READY");
  }, []);

  return (
    <GameSDKProvider sdk={sdk}>
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
