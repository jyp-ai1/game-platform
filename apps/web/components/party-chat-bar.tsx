"use client";

import { PARTY_REACTIONS, sendPartyReaction } from "@game-platform/replay-engine/social";
import type { PartyReactionId } from "@game-platform/shared";
import { Button } from "@game-platform/ui";

/** Party quick chat — 1-tap reactions for in-game use. */
export function PartyChatBar({ partyCode }: { partyCode: string }) {
  function react(id: PartyReactionId) {
    void sendPartyReaction(partyCode, id);
  }

  return (
    <div className="flex flex-wrap justify-center gap-1">
      {PARTY_REACTIONS.map((r) => (
        <Button
          key={r.id}
          size="sm"
          variant="outline"
          className="h-8 min-w-10 px-2 text-xs"
          onClick={() => react(r.id)}
          title={r.label}
        >
          {r.emoji}
        </Button>
      ))}
    </div>
  );
}
