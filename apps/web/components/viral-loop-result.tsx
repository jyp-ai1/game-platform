"use client";

import { ContinueTogetherPanel } from "@/components/continue-together-panel";
import { FriendPresenceStrip } from "@/components/friend-presence-strip";
import { PartyJourneyRecap } from "@/components/party-journey-recap";
import { ReturnTomorrowCard } from "@/components/return-tomorrow-card";
import {
  buildPartyJourneyFeed,
  loadPartyDaySocial,
  recordPartyGameSession,
} from "@/lib/party-day-social";
import { getDeviceId } from "@game-platform/game-sdk";
import {
  ActivityEngine,
  getFriends,
  getMyParty,
  type ViralLoopResult,
} from "@game-platform/replay-engine/social";
import { entryTrace } from "@game-platform/game-snake";
import { Button } from "@game-platform/ui";
import { Swords, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** Retention end flow — Result → Journey → Continue → 내일 약속 */
export function ViralLoopResultPanel({
  loop,
  onRematch,
}: {
  loop: ViralLoopResult;
  onRematch: () => void;
}) {
  const router = useRouter();
  const [party, setParty] = useState<Awaited<ReturnType<typeof getMyParty>>>(null);
  const friends = getFriends();
  const myId = getDeviceId();
  const myScore = loop.result.scores.find((s) => s.deviceId === myId)?.score ?? 0;
  const revenge = ActivityEngine.revenge(friends, myScore, loop.result.gameSlug);
  const dayMemory = loadPartyDaySocial();
  const revengeFriend =
    revenge?.nickname ??
    dayMemory?.primaryFriend ??
    null;

  useEffect(() => {
    const won = loop.result.winnerId === myId;
    const myNick = loop.result.scores.find((s) => s.deviceId === myId)?.nickname;
    recordPartyGameSession({
      gameSlug: loop.result.gameSlug,
      won,
      durationMs: 5 * 60_000,
      coPlayers: loop.result.scores.map((s) => s.nickname),
      myNickname: myNick,
    });
  }, [loop, myId]);

  useEffect(() => {
    if (loop.partyId) void getMyParty().then(setParty);
  }, [loop.partyId]);

  const memoryLines = useMemo(() => {
    const m = loadPartyDaySocial();
    return m ? buildPartyJourneyFeed(m) : [];
  }, [loop.result.gameSlug]);

  const winner = loop.result.winnerNickname;
  const topScore = loop.result.scores[0];
  const inviteHref = loop.partyId ? `/p/${loop.partyId}` : "/community";

  return (
    <div className="mx-auto max-w-lg space-y-3 p-4" data-testid="viral-loop-result">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">다음은?</p>
        <h1 className="mt-1 text-xl font-bold">
          {winner ? `${winner} 승리` : "판 완료"} · {topScore?.score.toLocaleString() ?? 0}점
        </h1>
      </div>

      <Button size="lg" className="w-full gap-2 text-base" onClick={onRematch}>
        <Swords className="size-5" /> 리매치
      </Button>

      <PartyJourneyRecap lines={memoryLines} onRematch={onRematch} />

      <ContinueTogetherPanel
        partyId={loop.partyId}
        currentGameSlug={loop.result.gameSlug}
        onRematch={onRematch}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="gap-1" nativeButton={false} render={
          <Link href={inviteHref}><UserPlus className="size-3" /> 친구 초대</Link>
        } />
        <Button variant="outline" size="sm" nativeButton={false} render={
          <Link href="/profile">Profile</Link>
        } />
      </div>

      <FriendPresenceStrip />

      <ReturnTomorrowCard partyProgress={party?.progress} revengeFriend={revengeFriend} />

      <details className="rounded-xl border border-white/10 bg-card/30 px-4 py-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">점수 상세</summary>
        <ul className="mt-2 space-y-1">
          {loop.result.scores.map((s) => (
            <li key={s.deviceId} className="flex justify-between">
              <span>{s.nickname}</span>
              <span className="tabular-nums font-medium">{s.score.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          +{loop.result.xp} XP · +{loop.result.coins} Coin
          {party ? ` · Party Lv${party.progress.level}` : ""}
        </p>
      </details>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={() => {
          entryTrace("EXIT", "PASS", "home");
          router.push("/");
        }}
      >
        홈으로
      </Button>
    </div>
  );
}
