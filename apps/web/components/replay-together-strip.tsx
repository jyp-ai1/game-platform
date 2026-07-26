"use client";

import { PartyJourneyFeed } from "@/components/party-journey-feed";
import {
  SnakeLiveGameCard,
  type SnakeFriendPresence,
} from "@/components/snake-live-game-card";
import { enterSnakeQuickPlay } from "@/lib/snake-entry";
import { emitPlatformNoticeWithRetry } from "@/lib/platform-notice";
import {
  fetchPresenceEntries,
  getGlobalWorldStatus,
  presenceMinutesAgo,
} from "@game-platform/multiplayer-sdk";
import type { Game } from "@game-platform/shared";
import type { PresenceEntry } from "@game-platform/shared";
import {
  getMyParty,
  PartyJourneyEngine,
  PartyMissionEngine,
} from "@game-platform/replay-engine/social";
import { ExperienceEngine } from "@game-platform/replay-engine/experience";
import { Button } from "@game-platform/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Plausible mock score when presence has no score field yet. */
function mockPresenceScore(nickname: string): number {
  const n = nickname.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return 800 + (n % 1200);
}

function presenceToFriend(entry: PresenceEntry): SnakeFriendPresence {
  const slug = entry.gameSlug ?? "snake";
  const room = entry.roomCode ?? "WORLD";
  const isSnake = slug === "snake" || slug.includes("snake");
  const playHref = isSnake
    ? `/flagship/snake-io/play?room=${encodeURIComponent(room)}`
    : entry.roomCode
      ? `/games/${slug}?room=${encodeURIComponent(room)}`
      : `/games/${slug}`;
  const spectateHref =
    entry.spectatable && entry.roomCode && isSnake
      ? `/flagship/snake-io/play?room=${encodeURIComponent(room)}&spectate=1`
      : undefined;

  return {
    nickname: entry.nickname,
    playHref,
    spectateHref,
    joinedMinutesAgo: presenceMinutesAgo(entry),
    score: mockPresenceScore(entry.nickname),
  };
}

/** Home hero — LIVE Snake game card first; friend is secondary info on the card. */
export function ReplayTogetherStrip({ snakeGame }: { snakeGame?: Game | null }) {
  const router = useRouter();
  const [friend, setFriend] = useState<SnakeFriendPresence | null>(null);
  const [presenceLoaded, setPresenceLoaded] = useState(false);
  const [party, setParty] = useState<Awaited<ReturnType<typeof getMyParty>>>(null);
  const [tournament, setTournament] = useState<{ label: string } | null>(null);

  const loadPresence = useCallback(async () => {
    try {
      getGlobalWorldStatus("snake");
      const presence = await fetchPresenceEntries();
      const playing = presence.filter((p) => p.status === "playing" || p.status === "lobby");
      const first = playing[0];
      setFriend(first ? presenceToFriend(first) : null);
    } catch {
      emitPlatformNoticeWithRetry("친구 목록", "플레이 중인 친구 정보를 불러오지 못했습니다.");
      setFriend(null);
    } finally {
      setPresenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadPresence();

      try {
        setParty(await getMyParty());
      } catch {
        emitPlatformNoticeWithRetry("Party", "Party 정보를 불러오지 못했습니다.");
      }

      try {
        const t = ExperienceEngine.tournament.upcoming()[0];
        if (t) {
          const mins = Math.max(0, Math.round((new Date(t.startsAt).getTime() - Date.now()) / 60_000));
          setTournament({
            label: mins <= 2 ? "🏆 토너먼트 시작!" : `🏆 토너먼트 ${mins}분 후`,
          });
        }
      } catch {
        emitPlatformNoticeWithRetry("토너먼트", "토너먼트 정보를 불러오지 못했습니다.");
      }
    })();

    const presencePoll = window.setInterval(() => void loadPresence(), 5000);
    return () => window.clearInterval(presencePoll);
  }, [loadPresence]);

  async function handleTournamentJoin() {
    try {
      await enterSnakeQuickPlay(router);
    } catch {
      emitPlatformNoticeWithRetry("입장", "토너먼트 입장에 실패했습니다.");
    }
  }

  const mission = party ? PartyMissionEngine.active(party) : null;
  const badges = party ? PartyJourneyEngine.achievements(party) : [];

  return (
    <section
      aria-labelledby="home-hero-heading"
      className="border-b border-primary/20 bg-gradient-to-b from-primary/10 to-transparent py-5 sm:py-6"
    >
      <div className="mx-auto max-w-4xl space-y-3 px-4">
        <h2 id="home-hero-heading" className="sr-only">
          LIVE Snake
        </h2>
        <SnakeLiveGameCard game={snakeGame} friend={friend} />

        {presenceLoaded && !friend ? (
          <p data-testid="hero-friend-empty" className="text-sm text-muted-foreground">
            지금 플레이 중인 친구가 없습니다.
          </p>
        ) : null}

        {tournament ? (
          <button
            type="button"
            aria-label="토너먼트 참가"
            onClick={handleTournamentJoin}
            className="motion-base flex w-full items-center justify-between rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm text-left transition hover:border-violet-400/50"
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
