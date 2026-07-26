"use client";

import { buildPartyJourneyFeed, loadPartyDaySocial, type JourneyLine } from "@/lib/party-day-social";
import Link from "next/link";

/** SNS-style Party Journey feed */
export function PartyJourneyFeed({
  lines,
  partyId,
  compact,
}: {
  lines?: JourneyLine[];
  partyId?: string | null;
  compact?: boolean;
}) {
  const feed = lines ?? (() => {
    const m = loadPartyDaySocial();
    return m ? buildPartyJourneyFeed(m) : [];
  })();

  if (feed.length === 0) return null;

  return (
    <div className={`rounded-2xl border border-violet-500/20 bg-violet-500/5 ${compact ? "p-3" : "p-5"}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Party Journey</p>
        {partyId ? (
          <Link href={`/p/${partyId}`} className="text-xs text-primary hover:underline">
            파티 →
          </Link>
        ) : null}
      </div>
      <ul className={`space-y-1.5 ${compact ? "mt-2 text-sm" : "mt-3"}`}>
        {feed.map((line, i) => (
          <li key={i}>
            <span className="mr-2">{line.emoji}</span>
            {line.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
