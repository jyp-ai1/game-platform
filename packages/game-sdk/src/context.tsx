"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import {
  recordNewBest,
  recordRankingSubmitted,
  recordScoreReport,
} from "./engagement";
import {
  getBestScore,
  getDeviceId,
  getLastNickname,
  setBestScore,
  setLastNickname,
} from "./local-storage";
import { recordMissionScoreReport } from "./missions";
import { NicknameModal } from "./nickname-modal";
import { recordSeasonNewBest, recordSeasonScoreReport } from "./season";
import { recordWeeklyMissionScoreReport } from "./weekly-missions";

// The one thing that's genuinely platform-specific (the actual network
// call). Everything else — "is this a new personal best?", the nickname
// prompt, remembering the last nickname — is generic and lives in this
// package so every game gets it for free.
export interface GameSDKAdapter {
  submitScore: (
    gameSlug: string,
    nickname: string,
    score: number,
    deviceId: string
  ) => Promise<void>;
}

export interface GameSDKApi {
  reportScore: (gameSlug: string, score: number) => void;
}

const GameSDKContext = createContext<GameSDKApi | null>(null);

export function GameSDKProvider({
  sdk,
  children,
}: {
  sdk: GameSDKAdapter;
  children: ReactNode;
}) {
  const [pending, setPending] = useState<{
    gameSlug: string;
    score: number;
  } | null>(null);

  const reportScore = useCallback((gameSlug: string, score: number) => {
    // Engagement side effects (XP, achievement checks) run on every round,
    // not just personal bests — the best-score gate below only controls
    // "is this worth a nickname prompt + leaderboard submission?".
    recordScoreReport(gameSlug, score);
    recordMissionScoreReport(gameSlug, score);
    recordWeeklyMissionScoreReport(gameSlug, score);
    recordSeasonScoreReport();

    if (score > getBestScore(gameSlug)) {
      setBestScore(gameSlug, score);
      recordNewBest(gameSlug, score);
      recordSeasonNewBest();
      setPending({ gameSlug, score });
    }
  }, []);

  async function handleSubmit(nickname: string) {
    const trimmed = nickname.trim();
    if (!pending || !trimmed) {
      return;
    }
    setLastNickname(trimmed);
    await sdk.submitScore(pending.gameSlug, trimmed, pending.score, getDeviceId());
    recordRankingSubmitted();
    setPending(null);
  }

  return (
    <GameSDKContext.Provider value={{ reportScore }}>
      {children}
      {pending ? (
        <NicknameModal
          score={pending.score}
          defaultNickname={getLastNickname()}
          onSubmit={handleSubmit}
          onDismiss={() => setPending(null)}
        />
      ) : null}
    </GameSDKContext.Provider>
  );
}

export function useGameSDK(): GameSDKApi {
  const sdk = useContext(GameSDKContext);
  if (!sdk) {
    throw new Error("useGameSDK must be used within a GameSDKProvider");
  }
  return sdk;
}
