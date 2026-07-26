"use client";

import { PartyJourneyFeed } from "@/components/party-journey-feed";
import {
  SnakeFriendJoinEntry,
  SnakeMultiplayerEntry,
} from "@/components/snake-multiplayer-entry";
import {
  getGlobalWorldStatus,
  quickPlayGlobal,
} from "@game-platform/multiplayer-sdk";
import {
  getMyParty,
  PartyJourneyEngine,
  PartyMissionEngine,
} from "@game-platform/replay-engine/social";
import { fetchPresenceEntries } from "@game-platform/multiplayer-sdk";
import { ExperienceEngine } from "@game-platform/replay-engine/experience";
import { Button } from "@game-platform/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface FriendWaiting {
  nickname: string;
  href: string;
  label: string;
}

/** Home hero — Friend first, else Snake LIVE Quick Play (no URL typing) */
export function ReplayTogetherStrip() {
  const router = useRouter();
  const [friend, setFriend] = useState<FriendWaiting | null>(null);
  const [party, setParty] = useState<Awaited<ReturnType<typeof getMyParty>>>(null);
  const [tournament, setTournament] = useState<{ label: string; href: string } | null>(null);

  useEffect(() => {
    void (async () => {
      getGlobalWorldStatus("snake");

      const presence = await fetchPresenceEntries();
      const playing = presence.filter((p) => p.status === "playing" || p.status === "lobby");
      const first = playing[0];
      if (first) {
        setFriend({
          nickname: first.nickname,
          href: first.roomCode ? `/p/${first.roomCode}` : "/flagship/snake-io/play?room=WORLD",
          label: first.gameSlug ? `${first.gameSlug.replace(/-/g, " ")} · ${first.status === "lobby" ? "로비" : "플레이 중"}` : "같이 플레이",
        });
      }

      setParty(await getMyParty());

      const t = ExperienceEngine.tournament.upcoming()[0];
      if (t) {
        const mins = Math.max(0, Math.round((new Date(t.startsAt).getTime() - Date.now()) / 60_000));
        setTournament({
          label: mins <= 2 ? "🏆 토너먼트 시작!" : `🏆 토너먼트 ${mins}분 후`,
          href: "/flagship/snake-io/play?room=WORLD",
        });
      }
    })();
  }, []);

  async function handleTournamentJoin() {
    try {
      const { href } = await quickPlayGlobal("snake");
      router.push(href);
    } catch {
      router.push("/flagship/snake-io/play?room=WORLD");
    }
  }

  const mission = party ? PartyMissionEngine.active(party) : null;
  const badges = party ? PartyJourneyEngine.achievements(party) : [];

  return (
    <section className="border-b border-primary/20 bg-gradient-to-b from-primary/10 to-transparent py-8">
      <div className="mx-auto max-w-4xl px-4 space-y-4">
        {friend ? (
          <SnakeFriendJoinEntry
            nickname={friend.nickname}
            href={friend.href}
            label={friend.label}
          />
        ) : (
          <SnakeMultiplayerEntry variant="hero" />
        )}

        {tournament ? (
          <button
            type="button"
            onClick={handleTournamentJoin}
            className="flex w-full items-center justify-between rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm text-left"
          >
            <span>{tournament.label}</span>
            <span className="text-violet-400">참가 →</span>
          </button>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {party ? (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/p/${party.id}`}>내 Party</Link>} />
          ) : (
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/community">Party 만들기</Link>} />
          )}
        </div>

        {(party || mission || badges.length > 0) ? (
          <details className="rounded-xl border border-white/10 bg-card/30 px-4 py-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">Party 자세히 보기</summary>
            <div className="mt-3 space-y-2 text-sm">
              {party ? (
                <p>Lv{party.progress.level} · Streak {party.progress.streak}일 · {party.members.length}명</p>
              ) : null}
              {mission ? (
                <p>🎯 {PartyMissionEngine.label(mission.missionId)} {mission.current}/{mission.target}</p>
              ) : null}
              {badges.length > 0 ? <p>🏅 {badges.join(" · ")}</p> : null}
              <PartyJourneyFeed partyId={party?.id} compact />
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
