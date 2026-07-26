"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { getDeviceId, getLastNickname } from "@game-platform/game-sdk";
import { Copy, MessageCircle, QrCode, Share2, Swords, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import {
  createChallenge,
  getChallengeShareText,
  getChallengeUrl,
  getChallengesVersion,
  listChallenges,
  subscribeChallenges,
  type ChallengeSession,
} from "@/lib/challenge-scores-store";
import { trackChallengeMetric, trackInviteMetric, trackShareMetric } from "@/components/product-metrics-bridge";
import { getFriendsList, searchFriends } from "@/lib/social-store";

export function GameChallengeHub({ games }: { games: Game[] }) {
  const searchParams = useSearchParams();
  const challengeSlug = searchParams.get("challenge");
  const challengeVersion = useSyncExternalStore(subscribeChallenges, getChallengesVersion, () => 0);
  const challenges = useMemo(() => listChallenges(100), [challengeVersion]);
  const friends = getFriendsList();
  const [gameSlug, setGameSlug] = useState(challengeSlug ?? games[0]?.slug ?? "");
  const [friendId, setFriendId] = useState(friends[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<ChallengeSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const game = games.find((g) => g.slug === gameSlug);
  const filteredFriends = useMemo(() => searchFriends(query), [query]);
  const friend = friends.find((f) => f.id === friendId) ?? filteredFriends[0];

  function startChallenge() {
    if (!game || !friend) return;
    const s = createChallenge(
      game.slug,
      game.title,
      getDeviceId(),
      getLastNickname() || "You",
      friend.id,
      friend.nickname
    );
    setSession(s);
    trackChallengeMetric();
  }

  async function shareWeb() {
    if (!session) return;
    const text = getChallengeShareText(session);
    const url = getChallengeUrl(session.id, session.gameSlug);
    if (navigator.share) {
      await navigator.share({ title: session.gameTitle, text, url });
    } else {
      await navigator.clipboard.writeText(text);
    }
    trackShareMetric();
  }

  function shareSms() {
    if (!session) return;
    window.location.href = `sms:?body=${encodeURIComponent(getChallengeShareText(session))}`;
    trackInviteMetric();
  }

  function shareDiscord() {
    if (!session) return;
    window.open(
      `https://discord.com/channels/@me?text=${encodeURIComponent(getChallengeShareText(session))}`,
      "_blank"
    );
  }

  function shareKakao() {
    if (!session) return;
    const url = getChallengeUrl(session.id, session.gameSlug);
    window.open(
      `https://story.kakao.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(session.gameTitle)}`,
      "_blank"
    );
  }

  async function copyLink() {
    if (!session) return;
    await navigator.clipboard.writeText(getChallengeShareText(session));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card/60 p-6">
      <div className="flex items-center gap-2">
        <Swords className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Friend Challenge</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        게임 선택 → 친구 초대 → 같이 플레이 → 결과 비교 → 재도전
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Game</label>
          <select
            className="mt-1 w-full rounded-xl border bg-background/60 px-3 py-2 text-sm"
            value={gameSlug}
            onChange={(e) => {
              setGameSlug(e.target.value);
              setSession(null);
            }}
          >
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Friend</label>
          <input
            type="search"
            placeholder="Search friends…"
            className="mt-1 w-full rounded-xl border bg-background/60 px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {(query ? filteredFriends : friends).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFriendId(f.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  friendId === f.id ? "border-primary bg-primary/20" : "border-white/10"
                }`}
              >
                {f.nickname}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!session ? (
        <Button className="mt-4 gap-1" size="sm" onClick={startChallenge} disabled={!game || !friend}>
          <Users className="size-3" /> Create Challenge
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm">
            Challenge <span className="font-semibold text-primary">{friend?.nickname}</span> in{" "}
            <span className="font-semibold">{game?.title}</span>
          </p>
          <p className="font-mono text-lg tracking-widest text-primary">{session.id}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={shareWeb}>
              <Share2 className="size-3" /> Share
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={shareSms}>
              <MessageCircle className="size-3" /> SMS
            </Button>
            <Button size="sm" variant="outline" onClick={shareKakao}>
              Kakao
            </Button>
            <Button size="sm" variant="outline" onClick={shareDiscord}>
              Discord
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={copyLink}>
              <Copy className="size-3" /> {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowQr((v) => !v)}>
              <QrCode className="size-3" /> QR
            </Button>
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/games/${session.gameSlug}?challenge=${session.id}`}>Play Now →</Link>
              }
            />
          </div>
          {showQr ? (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getChallengeUrl(session.id, session.gameSlug))}`}
              alt="Challenge QR code"
              width={180}
              height={180}
              className="rounded-xl border border-white/10"
            />
          ) : null}
        </div>
      )}

      {challenges.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent Challenges
          </p>
          <ul className="mt-2 space-y-2">
            {challenges.slice(0, 5).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm"
              >
                <span>
                  {c.gameTitle} vs {c.targetNickname}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {c.challengerScore ?? "—"} : {c.targetScore ?? "—"}
                  {c.status === "complete" ? " ✓" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
