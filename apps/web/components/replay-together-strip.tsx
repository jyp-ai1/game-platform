"use client";

import { fetchPresenceEntries } from "@game-platform/multiplayer-sdk";
import {
  fetchSituations,
  getActivePartyId,
  getMyParty,
  PartyMissionEngine,
} from "@game-platform/replay-engine/social";
import { ExperienceEngine } from "@game-platform/replay-engine/experience";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Replay Together — home top: friends waiting → party mission → tournament. */
export function ReplayTogetherStrip() {
  const [waiting, setWaiting] = useState<{ nickname: string; href: string; label: string }[]>([]);
  const [partyMission, setPartyMission] = useState<string | null>(null);
  const [tournament, setTournament] = useState<{ label: string; href: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const presence = await fetchPresenceEntries();
      const playing = presence.filter((p) => p.status === "playing" || p.status === "lobby");
      setWaiting(
        playing.slice(0, 3).map((p) => ({
          nickname: p.nickname,
          href: p.roomCode ? `/p/${p.roomCode}` : "/flagship/snake-io",
          label: p.gameSlug ? `${p.gameSlug.replace(/-/g, " ")} 중` : "대기 중",
        }))
      );

      const party = await getMyParty();
      const active = party ? PartyMissionEngine.active(party) : null;
      if (active && party) {
        setPartyMission(`${PartyMissionEngine.label(active.missionId)} ${active.current}/${active.target}`);
      } else if (getActivePartyId()) {
        setPartyMission("파티 대기 중");
      }

      const t = ExperienceEngine.tournament.upcoming()[0];
      if (t) {
        const mins = Math.max(0, Math.round((new Date(t.startsAt).getTime() - Date.now()) / 60_000));
        setTournament({
          label: mins <= 2 ? "토너먼트 시작!" : `토너먼트 ${mins}분 후`,
          href: "/flagship/snake-io",
        });
      }
    })();
    void fetchSituations();
  }, []);

  return (
    <section className="border-b border-primary/20 bg-gradient-to-b from-primary/10 to-transparent py-6">
      <div className="mx-auto max-w-4xl px-4">
        <p className="text-xs uppercase tracking-widest text-primary">Replay Together</p>
        <h2 className="mt-1 text-xl font-bold">친구가 먼저</h2>

        <div className="mt-4 space-y-3">
          {waiting.length > 0 ? (
            waiting.map((w) => (
              <Link
                key={w.nickname}
                href={w.href}
                className="flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 transition hover:border-primary/60"
              >
                <div>
                  <p className="font-semibold">{w.nickname} 기다리는 중</p>
                  <p className="text-sm text-muted-foreground">{w.label}</p>
                </div>
                <span className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Join →</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">친구가 접속하면 여기에 표시됩니다</p>
          )}

          {partyMission ? (
            <Link
              href={getActivePartyId() ? `/p/${getActivePartyId()}` : "/flagship/snake-io"}
              className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3"
            >
              <p className="text-sm font-medium">Party Mission · {partyMission}</p>
              <span className="text-xs text-emerald-400">→</span>
            </Link>
          ) : null}

          {tournament ? (
            <Link
              href={tournament.href}
              className="flex items-center justify-between rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 py-3"
            >
              <p className="text-sm font-medium">{tournament.label}</p>
              <span className="text-xs text-violet-400">참가 →</span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
