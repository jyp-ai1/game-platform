"use client";

import { GameErrorMonitor } from "@/components/game-error-monitor";
import { prefetchHomeShell } from "@/components/home-page-client";
import { ViralLoopResultPanel } from "@/components/viral-loop-result";
import { GameResultModal } from "@/components/game-result-modal";
import { getGameFramework } from "@/lib/game-framework";
import type { UniversalRewardBundle } from "@/lib/reward-engine";
import {
  GameSDKProvider,
  emitEngagementEvent,
  subscribePlatformAnalyticsEvents,
  MP_CONNECT_BACK_CLASS,
  MP_CONNECT_RETRY_CLASS,
} from "@game-platform/game-sdk";
import { rematchTogether, type ViralLoopResult } from "@game-platform/replay-engine/social";
import { entryLog, entryLogFail, entryTrace, resetEntryStatus, resetEngineSession } from "@game-platform/game-snake";
import { EntryCrashLog } from "@game-platform/multiplayer-sdk";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { SnakeIoPlayMeta } from "@/components/snake-io-play-meta";
import { SnakeDebugOverlay } from "@/components/snake-debug-overlay";
import type { Game } from "@game-platform/shared";
import {
  loadSnakeBodyColor,
  loadSnakeHeadCharacter,
  saveSnakeBodyColor,
  saveSnakeHeadCharacter,
  SnakeCharacterSelect,
  type SnakeHeadId,
} from "@game-platform/game-snake";

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

function SnakeConnectError({
  onRetry,
  onBack,
}: {
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div
      data-testid="snake-connect-error"
      className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-black px-6 text-center"
    >
      <p className="text-lg font-semibold text-red-200">Connection failed</p>
      <p className="max-w-sm text-sm text-white/60">
        Could not join the multiplayer world. Retry or go back to the game page.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          data-testid="snake-connect-retry"
          onClick={onRetry}
          className={MP_CONNECT_RETRY_CLASS}
        >
          Retry
        </button>
        <button
          type="button"
          data-testid="snake-connect-back"
          onClick={onBack}
          className={MP_CONNECT_BACK_CLASS}
        >
          Back to game
        </button>
      </div>
    </div>
  );
}

class SnakePlayErrorBoundary extends Component<
  { children: ReactNode; onConnectFailed: () => void },
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
    this.props.onConnectFailed();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <p className="text-sm text-amber-300">Connection failed — could not load multiplayer world.</p>
          {this.state.errorMessage ? (
            <p className="max-w-sm font-mono text-xs text-red-400">{this.state.errorMessage}</p>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

function SnakeIoPlayInner({
  practiceMode = false,
  debugMode = false,
  showMetaAfterExit = false,
  gameMeta,
}: {
  practiceMode?: boolean;
  debugMode?: boolean;
  showMetaAfterExit?: boolean;
  gameMeta?: Game;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const room = params.get("room");
  const blockedLocalRoom =
    room?.toUpperCase() === "PRACTICE" ||
    room?.toUpperCase() === "STAGE" ||
    params.get("mode") === "stage";
  const isStageMode = false;
  const [loop, setLoop] = useState<ViralLoopResult | null>(null);
  const [headCharacter, setHeadCharacter] = useState<SnakeHeadId>(() => loadSnakeHeadCharacter());
  const [bodyColor, setBodyColor] = useState(() => loadSnakeBodyColor());
  const [characterReady, setCharacterReady] = useState(false);
  const [connectFailed, setConnectFailed] = useState(false);
  const [connectRetryKey, setConnectRetryKey] = useState(0);
  const [showPostGameMeta, setShowPostGameMeta] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{
    score: number;
    rewards: UniversalRewardBundle;
  } | null>(null);
  const pendingSessionRef = useMemo(
    () => ({ current: null as { score: number; rewards: UniversalRewardBundle } | null }),
    []
  );

  useEffect(() => {
    if (!blockedLocalRoom) return;
    router.replace("/flagship/snake-io/play?room=WORLD");
  }, [blockedLocalRoom, router]);

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
    entryLogFail("JOIN", "missing room param");
    setConnectFailed(true);
  }, [practiceMode, room]);

  useEffect(() => {
    if (!isStageMode) return;
    const unsub = subscribePlatformAnalyticsEvents((event) => {
      if (event.type === "game-end" && event.gameSlug === "snake") {
        const rewards = getGameFramework("snake").onGameEnd(event.score);
        pendingSessionRef.current = { score: event.score, rewards };
      }
    });
    function onSessionExit(event: Event) {
      const detail = (event as CustomEvent<{ gameSlug?: string }>).detail;
      if (detail?.gameSlug !== "snake" || !pendingSessionRef.current) return;
      setSessionSummary(pendingSessionRef.current);
      pendingSessionRef.current = null;
    }
    window.addEventListener("replay:game-exit", onSessionExit);
    return () => {
      unsub();
      window.removeEventListener("replay:game-exit", onSessionExit);
    };
  }, [isStageMode, pendingSessionRef]);

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

  const handleConnectFailed = useCallback(() => {
    entryLogFail("CONNECT", "multiplayer join failed");
    setConnectFailed(true);
  }, []);

  const handleConnectRetry = useCallback(() => {
    resetEntryStatus();
    resetEngineSession();
    setConnectFailed(false);
    setConnectRetryKey((k) => k + 1);
  }, []);

  const handleConnectBack = useCallback(() => {
    router.push("/games/snake");
  }, [router]);

  const playBackHeader = (
    <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/80 px-3 py-2">
      <button
        type="button"
        data-testid="mp-play-back-detail"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
          }
          router.replace("/games/snake");
        }}
        className="text-xs font-medium text-white/70 transition hover:text-white"
      >
        ← Snake
      </button>
    </header>
  );

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
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-background">
        <ViralLoopResultPanel loop={loop} onRematch={handleRematch} />
        {showMetaAfterExit && gameMeta ? (
          <SnakeIoPlayMeta game={gameMeta} />
        ) : null}
      </div>
    );
  }

  if (showPostGameMeta && showMetaAfterExit && gameMeta) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-background">
        <SnakeIoPlayMeta game={gameMeta} />
      </div>
    );
  }

  if (connectFailed) {
    return <SnakeConnectError onRetry={handleConnectRetry} onBack={handleConnectBack} />;
  }

  if (!characterReady) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {playBackHeader}
        <div className="min-h-0 flex-1 overflow-auto">
          <SnakeCharacterSelect
            value={headCharacter}
            color={bodyColor}
            onChange={setHeadCharacter}
            onColorChange={setBodyColor}
            onConfirm={() => {
              saveSnakeHeadCharacter(headCharacter);
              saveSnakeBodyColor(bodyColor);
              setCharacterReady(true);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {playBackHeader}
      <div className="min-h-0 flex-1 overflow-hidden">
      {debugMode ? <SnakeDebugOverlay /> : null}
      <SnakePlayErrorBoundary onConnectFailed={handleConnectFailed}>
        <SnakeIoGame
          key={connectRetryKey}
          practiceMode={practiceMode}
          onConnectFailed={handleConnectFailed}
          headCharacter={headCharacter}
          bodyColor={bodyColor}
        />
      </SnakePlayErrorBoundary>
      {sessionSummary ? (
        <GameResultModal
          slug="snake"
          score={sessionSummary.score}
          rewards={sessionSummary.rewards}
          onClose={() => {
            setSessionSummary(null);
            if (showMetaAfterExit && gameMeta) {
              setShowPostGameMeta(true);
              return;
            }
            router.push("/games/snake");
          }}
        />
      ) : null}
      </div>
    </div>
  );
}

/** Snake.io play — SDK wrapper, SSR off, explicit MP connect errors (no practice disguise). */
export function SnakeIoPlayClient({
  showMetaAfterExit = false,
  gameMeta,
}: {
  showMetaAfterExit?: boolean;
  gameMeta?: Game;
} = {}) {
  const params = useSearchParams();
  const practiceMode = false;
  const debugMode = params.get("debug") === "1";
  const sdk = useMemo(() => ({ submitScore }), []);

  useEffect(() => {
    entryLog("PROVIDER_READY");
  }, []);

  return (
    <GameSDKProvider sdk={sdk}>
      <GameErrorMonitor gameSlug="snake" />
      <SnakeIoPlayInner
        practiceMode={practiceMode}
        debugMode={debugMode}
        showMetaAfterExit={showMetaAfterExit}
        gameMeta={gameMeta}
      />
    </GameSDKProvider>
  );
}

export function SnakeIoPlayClientRoot({
  showMetaAfterExit = false,
  game,
}: {
  showMetaAfterExit?: boolean;
  game?: Game;
} = {}) {
  return (
    <Suspense fallback={<p className="text-center text-muted-foreground">Loading…</p>}>
      <SnakeIoPlayClient showMetaAfterExit={showMetaAfterExit} gameMeta={game} />
    </Suspense>
  );
}
