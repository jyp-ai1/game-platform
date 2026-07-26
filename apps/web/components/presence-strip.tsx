"use client";

import {
  formatPresenceLabel,
  getPresenceEntries,
  presenceMinutesAgo,
} from "@game-platform/multiplayer-sdk";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Universal Presence — friends currently online / playing / in lobby. */
export function PresenceStrip({ compact = false }: { compact?: boolean }) {
  const [entries, setEntries] = useState(() => getPresenceEntries());

  useEffect(() => {
    const id = setInterval(() => setEntries(getPresenceEntries()), 3000);
    return () => clearInterval(id);
  }, []);

  const active = entries.filter((e) => e.status !== "online").slice(0, compact ? 3 : 6);
  if (active.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-card/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Friends Online
      </p>
      <ul className="mt-3 space-y-2">
        {active.map((e) => (
          <li key={e.deviceId} className="flex items-center justify-between text-sm">
            <span>
              <span className="mr-2 inline-block size-2 rounded-full bg-emerald-400" />
              {formatPresenceLabel(e)}
            </span>
            <span className="text-xs text-muted-foreground">{presenceMinutesAgo(e)}분</span>
            {e.spectatable && e.roomCode ? (
              <Link
                href={`/p/${e.roomCode}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                관전
              </Link>
            ) : e.status === "lobby" && e.roomCode ? (
              <Link
                href={`/p/${e.roomCode}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                참가
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
