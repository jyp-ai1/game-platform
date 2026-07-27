"use client";

import { subscribePlatformAnalyticsEvents } from "@game-platform/game-sdk";
import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Loader2, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { GameResultModal } from "@/components/game-result-modal";
import { RuntimeRewardFlash } from "@/components/runtime-reward-flash";
import {
  getActiveChallengeId,
  recordChallengeScore,
  setActiveChallenge,
} from "@/lib/challenge-scores-store";
import { getDeviceId } from "@game-platform/game-sdk";
import { getGameFramework } from "@/lib/game-framework";
import { getDifficultyLabel, getRuntimeConfig } from "@/lib/game-runtime-config";
import { selectRecommended } from "@/lib/game-sections";
import {
  getFavoritesSnapshot,
  getRecentlyPlayedSnapshot,
  getServerFavoritesSnapshot,
  getServerRecentlyPlayedSnapshot,
} from "@/lib/local-storage";
import type { UniversalRewardBundle } from "@/lib/reward-engine";
import { emitRuntimeEvent, type RuntimePhase } from "@/lib/runtime-events";
import { trackAnalyticsEvent } from "@/lib/supabase/analytics";

const TUTORIAL_SEEN_KEY = "play29:runtime-tutorial-seen";

export function RuntimeProvider({
  slug,
  games,
  children,
}: {
  slug: string;
  games: Game[];
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challenge") ?? getActiveChallengeId();
  const config = getRuntimeConfig(slug);
  const [phase, setPhase] = useState<RuntimePhase>("loading");
  const [paused, setPaused] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [result, setResult] = useState<{ score: number; rewards: UniversalRewardBundle } | null>(null);
  const [showRewardFlash, setShowRewardFlash] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const goPhase = useCallback((next: RuntimePhase) => {
    setPhase(next);
    emitRuntimeEvent({ type: "phase", phase: next });
    if (next === "playing") {
      trackAnalyticsEvent("game_start", { gameSlug: slug }).catch(() => {});
    } else if (next === "paused") {
      trackAnalyticsEvent("game_pause", { gameSlug: slug }).catch(() => {});
    }
  }, [slug]);

  useEffect(() => {
    goPhase("loading");
    setPaused(false);
    setResult(null);
    setShowResult(false);
    setShowRewardFlash(false);

    const seen =
      typeof window !== "undefined" &&
      window.localStorage.getItem(`${TUTORIAL_SEEN_KEY}:${slug}`);
    setShowTutorial(!seen);

    const t = window.setTimeout(() => goPhase(seen ? "ready" : "tutorial"), 450);
    return () => window.clearTimeout(t);
  }, [slug, goPhase]);

  useEffect(() => {
    const framework = getGameFramework(slug);
    return subscribePlatformAnalyticsEvents((event) => {
      if (event.type !== "game-end" || event.gameSlug !== slug) return;

      const rewards = framework.onGameEnd(event.score, games);
      if (challengeId) {
        recordChallengeScore(challengeId, getDeviceId(), event.score);
        setActiveChallenge(challengeId);
      }
      setResult({ score: event.score, rewards });
      goPhase("gameover");
      emitRuntimeEvent({ type: "game-end", gameSlug: slug, score: event.score });
      emitRuntimeEvent({ type: "mission-trigger" });
      emitRuntimeEvent({ type: "collection-trigger", gameSlug: slug });
      emitRuntimeEvent({
        type: "analytics",
        name: "game_end",
        payload: { score: event.score, coins: rewards.coins },
      });

      goPhase("reward");
      setShowRewardFlash(true);
      emitRuntimeEvent({ type: "reward-shown", xp: rewards.xpDisplay, coins: rewards.coins });

      window.setTimeout(() => {
        setShowRewardFlash(false);
        setShowResult(true);
      }, 1400);
    });
  }, [slug, goPhase, challengeId, games]);

  function finishTutorial() {
    window.localStorage.setItem(`${TUTORIAL_SEEN_KEY}:${slug}`, "1");
    setShowTutorial(false);
    goPhase("ready");
  }

  function handlePause() {
    setPaused(true);
    goPhase("paused");
  }

  function handleResume() {
    setPaused(false);
    goPhase("playing");
  }

  function handleResultClose() {
    setShowResult(false);
    setResult(null);
    goPhase("continue");
  }

  const favorites = getFavoritesSnapshot();
  const recent = getRecentlyPlayedSnapshot();
  const recommend =
    selectRecommended(games, recent, favorites, 1)[0] ?? games.find((g) => g.slug !== slug);

  if (phase === "loading") {
    return (
      <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-muted/30 backdrop-blur animate-in fade-in">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading…</p>
        <p className="text-xs text-muted-foreground">{getDifficultyLabel(slug)} · Runtime 3.0</p>
      </div>
    );
  }

  if (phase === "tutorial" && showTutorial) {
    return (
      <StartOverlay
        title={games.find((g) => g.slug === slug)?.title ?? slug}
        hint={config.tutorialHint}
        onStart={finishTutorial}
      />
    );
  }

  if (phase === "ready") {
    return (
      <StartOverlay
        title={games.find((g) => g.slug === slug)?.title ?? slug}
        hint={config.tutorialHint}
        onStart={() => goPhase("playing")}
      />
    );
  }

  return (
    <>
      <div className="relative animate-in fade-in">
        {(paused || phase === "paused") && phase !== "reward" && !showResult ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/90 backdrop-blur-sm">
            <Pause className="size-10 text-primary" />
            <p className="font-semibold">Paused</p>
            <Button size="sm" className="gap-2" onClick={handleResume}>
              <Play className="size-4" /> Resume
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/">Exit</Link>} />
          </div>
        ) : null}

        {phase === "playing" && !showResult ? (
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded-full border border-white/10 bg-background/80 p-2 shadow-lg backdrop-blur transition-transform hover:scale-105"
            onClick={handlePause}
            aria-label="Pause"
          >
            <Pause className="size-4" />
          </button>
        ) : null}

        <div className={paused ? "pointer-events-none opacity-40" : ""}>{children}</div>
      </div>

      {result ? (
        <RuntimeRewardFlash xp={result.rewards.xpDisplay} coins={result.rewards.coins} visible={showRewardFlash} />
      ) : null}

      {showResult && result ? (
        <GameResultModal
          slug={slug}
          score={result.score}
          rewards={result.rewards}
          games={games}
          recommend={recommend}
          challengeId={challengeId}
          onClose={handleResultClose}
        />
      ) : null}

      {phase === "continue" && !showResult ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href={`/games/${slug}`}>Retry</Link>} />
          {recommend ? (
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href={`/games/${recommend.slug}`}>Next · {recommend.title}</Link>}
            />
          ) : null}
          <Button variant="outline" nativeButton={false} render={<Link href="/">Continue</Link>} />
        </div>
      ) : null}
    </>
  );
}

function StartOverlay({
  title,
  hint,
  onStart,
}: {
  title: string;
  hint: string;
  onStart: () => void;
}) {
  const shortHint = hint.length > 80 ? `${hint.slice(0, 77)}…` : hint;
  return (
    <div className="mx-auto flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-4 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-card/90 p-6 backdrop-blur animate-in fade-in">
      <p className="text-2xl font-bold">🎮 {title}</p>
      <p className="max-w-xs text-center text-sm text-muted-foreground">{shortHint}</p>
      <Button
        size="lg"
        onClick={onStart}
        className="h-14 min-w-[200px] scale-100 text-base font-bold shadow-lg shadow-violet-500/25 bg-violet-600 hover:bg-violet-500 hover:scale-[1.02] transition-transform"
      >
        게임 시작
      </Button>
      <p className="text-xs text-muted-foreground">Press Start</p>
    </div>
  );
}
