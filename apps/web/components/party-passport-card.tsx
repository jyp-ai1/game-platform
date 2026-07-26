"use client";

import type { Party } from "@game-platform/shared";
import { PartyMissionEngine, PartyJourneyEngine } from "@game-platform/replay-engine/social";
import { PartyJourneyFeed } from "@/components/party-journey-feed";

/** Party Passport — growth with friends */
export function PartyPassportCard({ party }: { party: Party | null }) {
  if (!party) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card/50 p-5 text-sm text-muted-foreground">
        Party에 참가하면 Party Passport가 열립니다.
      </div>
    );
  }

  const mission = PartyMissionEngine.active(party);
  const badges = PartyJourneyEngine.achievements(party);
  const story = PartyJourneyEngine.story(party);

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Party Passport</p>
      <p className="text-lg font-bold">Lv{party.progress.level}</p>
      <p className="text-sm text-muted-foreground">{story}</p>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg border border-white/10 p-2">
          <p className="text-xs text-muted-foreground">Streak</p>
          <p className="font-bold">{party.progress.streak}일</p>
        </div>
        <div className="rounded-lg border border-white/10 p-2">
          <p className="text-xs text-muted-foreground">Coin</p>
          <p className="font-bold">{party.progress.partyCoin}</p>
        </div>
        <div className="rounded-lg border border-white/10 p-2">
          <p className="text-xs text-muted-foreground">함께</p>
          <p className="font-bold">{party.history.length}판</p>
        </div>
      </div>
      {mission ? (
        <p className="text-sm">🎯 {PartyMissionEngine.label(mission.missionId)} {mission.current}/{mission.target}</p>
      ) : null}
      {badges.length > 0 ? (
        <p className="text-xs text-muted-foreground">🏅 {badges.join(" · ")}</p>
      ) : null}
      <PartyJourneyFeed partyId={party.id} compact />
    </div>
  );
}
