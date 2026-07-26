"use client";

import { UniversalMultiplayerResult } from "@/components/universal-multiplayer-result";
import { ContinueTogetherPanel } from "@/components/continue-together-panel";
import { FriendPassportCard } from "@/components/friend-passport-card";
import { PartyChatBar } from "@/components/party-chat-bar";
import { getFriends, getMyParty, PartyJourneyEngine, type ViralLoopResult } from "@game-platform/replay-engine/social";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Viral Loop Result — result + friends + continue together + party journey. */
export function ViralLoopResultPanel({
  loop,
  onRematch,
}: {
  loop: ViralLoopResult;
  onRematch: () => void;
}) {
  const router = useRouter();
  const [party, setParty] = useState<Awaited<ReturnType<typeof getMyParty>>>(null);
  const friends = getFriends().slice(0, 3);

  useEffect(() => {
    if (loop.partyId) void getMyParty().then(setParty);
  }, [loop.partyId]);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <UniversalMultiplayerResult
        result={loop.result}
        onRematch={onRematch}
        onContinue={() => router.push(loop.partyId ? `/p/${loop.partyId}` : "/")}
        partyProgress={party?.progress}
      />
      {loop.partyId ? (
        <>
          <PartyChatBar partyCode={loop.partyId} />
          {party ? (
            <p className="text-center text-xs text-muted-foreground">
              {PartyJourneyEngine.story(party)} · +{party.progress.partyCoin} Party Coin
            </p>
          ) : null}
        </>
      ) : null}
      <ContinueTogetherPanel
        partyId={loop.partyId}
        currentGameSlug={loop.result.gameSlug}
        onRematch={onRematch}
      />
      {friends.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">함께한 친구</p>
          {friends.map((f) => (
            <FriendPassportCard key={f.deviceId} friend={f} roomCode={loop.partyId ?? undefined} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
