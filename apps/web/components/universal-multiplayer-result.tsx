"use client";

import type { MultiplayerResultPayload, PartyProgress } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Share2, Swords, Trophy } from "lucide-react";
import Link from "next/link";

/** Universal Multiplayer Result — identical across all party/realtime games. */
export function UniversalMultiplayerResult({
  result,
  onRematch,
  onContinue,
  partyProgress,
  partyId,
}: {
  result: MultiplayerResultPayload;
  onRematch?: () => void;
  onContinue?: () => void;
  partyProgress?: PartyProgress;
  partyId?: string | null;
}) {
  const isWinner = result.scores[0]?.deviceId === result.winnerId;
  const rematchHref = partyId ? `/p/${partyId}` : `/p/${result.roomCode}`;

  return (
    <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-primary/5 to-card p-6 sm:p-8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Trophy className="size-4 text-amber-400" />
        Match Result
      </div>

      {partyProgress ? (
        <p className="mt-2 text-xs text-primary">
          Party Lv{partyProgress.level} · Streak {partyProgress.streak} · +XP
        </p>
      ) : null}

      {result.winnerNickname ? (
        <h2 className="mt-4 text-2xl font-bold">
          {isWinner ? "승리!" : `${result.winnerNickname} 승리`}
        </h2>
      ) : (
        <h2 className="mt-4 text-2xl font-bold">무승부</h2>
      )}

      <ul className="mt-4 space-y-2">
        {result.scores.map((s, i) => (
          <li
            key={s.deviceId}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
              i === 0 ? "border-amber-500/40 bg-amber-500/10" : "border-white/10"
            }`}
          >
            <span>{s.nickname}</span>
            <span className="font-bold tabular-nums">{s.score.toLocaleString()}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        <RewardStat label="XP" value={`+${result.xp}`} />
        <RewardStat label="Coin" value={`+${result.coins}`} />
        <RewardStat label="Replay" value={`+${result.replayScoreDelta}`} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {onRematch ? (
          <Button onClick={onRematch} className="gap-1">
            <Swords className="size-4" /> Rematch
          </Button>
        ) : (
          <Button nativeButton={false} render={<Link href={rematchHref}>Rematch</Link>} className="gap-1">
            <Swords className="size-4" /> Rematch
          </Button>
        )}
        <Button variant="outline" className="gap-1" nativeButton={false} render={
          <Link href={`/games/${result.gameSlug}`}>Share</Link>
        }>
          <Share2 className="size-4" /> Share
        </Button>
        {onContinue ? (
          <Button variant="outline" onClick={onContinue}>Continue</Button>
        ) : (
          <Button variant="outline" nativeButton={false} render={<Link href="/">Continue</Link>}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

function RewardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/50 p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold text-primary">{value}</p>
    </div>
  );
}
