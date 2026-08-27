"use client";

import { GameErrorMonitor } from "@/components/game-error-monitor";
import { prefetchHomeShell } from "@/components/home-page-client";
import { ViralLoopResultPanel } from "@/components/viral-loop-result";
import { GameResultModal } from "@/components/game-result-modal";
import { getGameFramework } from "@/lib/game-framework";
import type { UniversalRewardBundle } from "@/lib/reward-engine";
import { GameSDKProvider, DEFAULT_MP_AI_DIFFICULTY, emitEngagementEvent, getDeviceId, subscribePlatformAnalyticsEvents } from "@game-platform/game-sdk";
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
  SNAKE_HEAD_CHARACTERS,
  type SnakeHeadId,
} from "@game-platform/game-snake";

import { submitScore as submitScoreRpc } from "@/lib/supabase/scores";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";
import { trackGame29Min } from "@/lib/analytics-min";
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
  const isStageMode = room?.toUpperCase() === "STAGE";
  const [loop, setLoop] = useState<ViralLoopResult | null>(null);
  const [headCharacter, setHeadCharacter] = useState<SnakeHeadId>(() => loadSnakeHeadCharacter());
  const [bodyColor, setBodyColor] = useState(() =>
    loadSnakeBodyColor(SNAKE_HEAD_CHARACTERS[loadSnakeHeadCharacter()].bodyColor)
  );
  const [characterReady, setCharacterReady] = useState(false);
  const aiDifficulty = DEFAULT_MP_AI_DIFFICULTY;
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
    resetEntryStatus();
    entryLog("PLAY_PAGE_MOUNT");
    // Sprint17 STEP5 — minimal session envelope (no big analytics system).
    const roomId = practiceMode ? "PRACTICE" : room ?? "unknown";
    const deviceId = getDeviceId();
    trackGame29Min("session_start", { gameId: "snake", roomId, deviceId });
    trackGame29Min("game_start", { gameId: "snake", roomId, deviceId });
    return () => {
      trackGame29Min("game_end", { gameId: "snake", roomId, deviceId });
      entryLog("PLAY_PAGE_UNMOUNT");
      resetEngineSession();
    };
  }, [practiceMode, room]);

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

  const goPractice = useCallback(() => {
    const roomNow = params.get("room")?.toUpperCase() ?? "";
    const sourceNow = params.get("source")?.toUpperCase() ?? "";
    // Invite / pinned WORLD-*: never auto-dump to PRACTICE
    if (/^WORLD-[A-Z0-9]+$/.test(roomNow) || sourceNow === "INVITE") {
      entryLogFail("JOIN", `invite keep-room ${roomNow} — practice blocked`);
      return;
    }
    entryLog("PRACTICE_FALLBACK");
    emitEngagementEvent({
      type: "practice-fallback",
      message: PRACTICE_FALLBACK_MSG,
    });
    router.replace(PRACTICE_URL);
  }, [router, params]);

  const handleInviteJoinTimeout = useCallback(() => {
    const roomNow = params.get("room")?.toUpperCase() ?? "";
    const sourceNow = params.get("source")?.toUpperCase() ?? "";
    if (/^WORLD-[A-Z0-9]+$/.test(roomNow) || sourceNow === "INVITE") {
      entryLogFail("TIMEOUT", `invite keep-room ${roomNow} — retry in-game`);
      return;
    }
    goPractice();
  }, [params, goPractice]);

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

  if (!characterReady) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-black">
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SnakeCharacterSelect
            value={headCharacter}
            onChange={(id) => {
              setHeadCharacter(id);
              setBodyColor(SNAKE_HEAD_CHARACTERS[id].bodyColor);
            }}
            color={bodyColor}
            onColorChange={setBodyColor}
            players={1}
            bots={practiceMode ? 0 : 49}
            roomCode={practiceMode ? "PRACTICE" : room?.toUpperCase() ?? undefined}
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
    <>
      {debugMode ? <SnakeDebugOverlay /> : null}
      <SnakePlayErrorBoundary onPracticeFallback={goPractice}>
        <SnakeIoGame
          practiceMode={practiceMode}
          onJoinTimeout={handleInviteJoinTimeout}
          onExitToDetail={() => router.push("/games/snake")}
          onExitToLobby={() => setCharacterReady(false)}
          headCharacter={headCharacter}
          bodyColor={bodyColor}
          aiDifficulty={aiDifficulty}
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
    </>
  );
}

/** Snake.io play — SDK wrapper, SSR off, practice fallback. */
export function SnakeIoPlayClient({
  showMetaAfterExit = false,
  gameMeta,
}: {
  showMetaAfterExit?: boolean;
  gameMeta?: Game;
} = {}) {
  const params = useSearchParams();
  const practiceMode = params.get("room")?.toUpperCase() === "PRACTICE";
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
