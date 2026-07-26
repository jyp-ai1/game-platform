"use client";

import { FriendPresenceStrip } from "@/components/friend-presence-strip";
import { PartyJourneyFeed } from "@/components/party-journey-feed";
import {
  getActivePartyId,
  getMyParty,
  PartyJourneyEngine,
  PartyMissionEngine,
} from "@game-platform/replay-engine/social";
import { Button } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Home — Party > Game. People hang out here first. */
export function PartySocialHub() {
  const [party, setParty] = useState<Awaited<ReturnType<typeof getMyParty>>>(null);

  useEffect(() => {
    const id = getActivePartyId();
    if (id) void getMyParty().then(setParty);
  }, []);

  const mission = party ? PartyMissionEngine.active(party) : null;
  const badges = party ? PartyJourneyEngine.achievements(party) : [];

  return (
    <section className="border-b border-white/5 py-6">
      <div className="mx-auto max-w-4xl px-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-400">Party First</p>
          <h2 className="mt-1 text-lg font-bold">같이 놀기</h2>
          <p className="text-sm text-muted-foreground">게임을 고르지 않아도 됩니다 — Party를 만드세요</p>
        </div>

        {party ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Party Lv{party.progress.level}</p>
                <p className="text-xs text-muted-foreground">
                  Streak {party.progress.streak} · Coin {party.progress.partyCoin} · {party.members.length}명
                </p>
              </div>
              <Button size="sm" nativeButton={false} render={<Link href={`/p/${party.id}`}>파티 입장</Link>} />
            </div>
            {mission ? (
              <p className="mt-2 text-sm text-emerald-200/90">
                🎯 같이 하는 미션: {PartyMissionEngine.label(mission.missionId)} ({mission.current}/{mission.target})
              </p>
            ) : null}
            {badges.length > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">🏅 {badges.join(" · ")}</p>
            ) : null}
          </div>
        ) : (
          <Button nativeButton={false} render={<Link href="/community">Party 만들기 / 친구 찾기</Link>} />
        )}

        <PartyJourneyFeed partyId={party?.id} compact />

        <FriendPresenceStrip />
      </div>
    </section>
  );
}
