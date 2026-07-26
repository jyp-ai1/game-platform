"use client";

import { PartyChatBar } from "@/components/party-chat-bar";
import { PartyInvitePanel } from "@/components/party-invite-panel";
import { PartyJourneyFeed } from "@/components/party-journey-feed";
import { getDeviceId } from "@game-platform/game-sdk";
import {
  ensureRoom,
  getPartyLinkUrl,
  joinRoomAsync,
  setPlayerReady,
  subscribeRoom,
  tickRoomCountdown,
} from "@game-platform/multiplayer-sdk";
import {
  getParty,
  joinParty,
  sendPartyChat,
  setPartyReady,
  subscribeParty,
  travelToGame,
  PartyMissionEngine,
} from "@game-platform/replay-engine/social";
import type { Party, PartyMember } from "@game-platform/shared";
import { Button, Container } from "@game-platform/ui";
import { MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Universal Party lobby — persistent party above room, cross-device Realtime. */
export function PartyLinkLobby({ code }: { code: string }) {
  const searchParams = useSearchParams();
  const autoJoin = searchParams.get("join") === "1";
  const [guestName, setGuestName] = useState("");
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState<Awaited<ReturnType<typeof ensureRoom>>>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(true);

  const roomCode = party?.currentRoomCode;

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const p = await getParty(code);
      if (!active) return;
      setParty(p);
      if (p?.currentRoomCode) {
        const r = await ensureRoom(p.currentRoomCode);
        if (active) setRoom(r);
      }
      if (active) setLoading(false);
    })();
    const unsubParty = subscribeParty(code, (p) => {
      setParty(p);
      if (p.currentRoomCode) void ensureRoom(p.currentRoomCode).then(setRoom);
    });
    return () => {
      active = false;
      unsubParty();
    };
  }, [code]);

  const deviceId = getDeviceId();
  const partyMember = party?.members.find((m) => m.deviceId === deviceId);

  useEffect(() => {
    if (!autoJoin || !party || loading || partyMember) return;
    void joinParty(code, "Guest").then((p) => {
      if (p) { setParty(p); setJoined(true); }
    });
  }, [autoJoin, party, loading, partyMember, code]);

  useEffect(() => {
    if (!roomCode) return;
    const unsubRoom = subscribeRoom(roomCode, setRoom);
    return unsubRoom;
  }, [roomCode]);

  const inParty = joined || !!partyMember;
  const isLeader = party?.leaderId === deviceId;
  const members: PartyMember[] = party?.members ?? [];
  const allReady = members.length >= 2 && members.every((m) => m.ready);
  const gameSlug = party?.currentGameSlug ?? room?.gameSlug ?? "snake";
  const maxPlayers = room?.maxPlayers ?? 20;

  useEffect(() => {
    if (!allReady || !room || room.status !== "ready" || room.countdown <= 0 || !roomCode) return;
    const id = setInterval(() => {
      const next = tickRoomCountdown(roomCode);
      if (next) setRoom({ ...next });
    }, 1000);
    return () => clearInterval(id);
  }, [allReady, room?.status, room?.countdown, roomCode]);

  async function handleJoin() {
    const nickname = guestName.trim() || "Guest";
    const nextParty = await joinParty(code, nickname);
    if (nextParty) {
      setParty(nextParty);
      setJoined(true);
    }
    if (nextParty?.currentRoomCode) {
      const nextRoom = await joinRoomAsync(nextParty.currentRoomCode, { nickname, isGuest: true });
      if (nextRoom) setRoom(nextRoom);
    }
  }

  async function handleReady() {
    await setPartyReady(code, true);
    if (roomCode) setPlayerReady(roomCode, true);
  }

  async function handleTravel() {
    const result = await travelToGame(code, gameSlug);
    if (result) {
      setParty(result.party);
      const r = await ensureRoom(result.roomCode);
      setRoom(r);
    }
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const next = await sendPartyChat(code, chatInput.trim());
    if (next) setParty(next);
    setChatInput("");
  }

  if (loading) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-muted-foreground">파티 연결 중…</p>
      </Container>
    );
  }

  if (!party) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-semibold">파티를 찾을 수 없습니다</p>
        <p className="mt-2 text-sm text-muted-foreground">링크가 만료되었거나 잘못된 코드입니다.</p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/games">게임 둘러보기</Link>} />
      </Container>
    );
  }

  const gameStarted = room?.status === "playing" || (allReady && room?.countdown === 0);
  const playHref = gameSlug === "snake"
    ? `/flagship/snake-io/play?room=${roomCode ?? code}`
    : `/games/${gameSlug}?room=${roomCode ?? code}`;
  const mission = PartyMissionEngine.active(party);
  const inviteReason = mission
    ? `오늘 우리 Party — ${PartyMissionEngine.label(mission.missionId)} (${mission.current}/${mission.target})`
    : `오늘 우리 Party Lv${party.progress.level + 1} 찍자`;

  return (
    <Container className="flex min-h-[60vh] max-w-md flex-col justify-center py-10">
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card/90 p-8 text-center shadow-lg shadow-primary/10">
        <Users className="mx-auto size-8 text-primary" />
        <h1 className="mt-4 text-xl font-bold">Universal Party</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {members.length}명 · {gameStarted ? `${gameSlug.replace(/-/g, " ")} 중` : "같이 놀 준비"}
        </p>

        <p className="mt-4 text-4xl font-bold tabular-nums text-primary">
          {members.length} / {maxPlayers}
        </p>
        {members.length < 2 && !gameStarted ? (
          <p className="mt-1 text-sm text-amber-400">친구 초대 후 함께 플레이</p>
        ) : null}

        {!inParty ? (
          <div className="mt-6 space-y-3">
            <input
              type="text"
              placeholder="닉네임 (Guest)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-background/80 px-4 py-3 text-center text-sm outline-none focus:border-primary"
              maxLength={16}
            />
            <Button className="w-full" size="lg" onClick={handleJoin}>
              파티 입장
            </Button>
            <p className="text-xs text-muted-foreground">로그인 없이 · Cross-device Realtime</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <ul className="space-y-2 text-left">
              {members.map((p) => (
                <li
                  key={p.deviceId}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
                >
                  <span>{p.nickname}{p.isLeader ? " 👑" : ""}</span>
                  <span className={p.ready ? "text-emerald-400" : "text-muted-foreground"}>
                    {p.ready ? "Ready ✓" : "Waiting…"}
                  </span>
                </li>
              ))}
            </ul>

            {partyMember && !partyMember.ready && !gameStarted ? (
              <Button className="w-full" onClick={handleReady}>Ready</Button>
            ) : null}

            {isLeader && !gameStarted ? (
              <Button className="w-full" variant="outline" onClick={handleTravel}>
                {roomCode ? "게임 재시작" : "게임 시작 (파티 이동)"}
              </Button>
            ) : null}

            {gameStarted ? (
              <Button className="w-full" size="lg" nativeButton={false} render={<Link href={playHref}>게임 시작 →</Link>} />
            ) : allReady && room && room.countdown > 0 ? (
              <p className="text-3xl font-bold tabular-nums text-primary">{room.countdown}</p>
            ) : null}

            {party.chat.length > 0 ? (
              <div className="max-h-24 overflow-y-auto rounded-xl border border-white/10 p-2 text-left text-xs">
                {party.chat.slice(-5).map((m) => (
                  <p key={m.id} className="text-muted-foreground">
                    <span className="text-foreground">{m.nickname}</span>: {m.text}
                    {m.emoji ? ` ${m.emoji}` : ""}
                  </p>
                ))}
              </div>
            ) : null}

            <PartyChatBar partyCode={code} />

            <form onSubmit={handleChat} className="flex gap-2">
              <input
                type="text"
                placeholder="파티 채팅…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                maxLength={120}
              />
              <Button type="submit" size="sm" variant="outline" aria-label="Send chat">
                <MessageCircle className="size-4" />
              </Button>
            </form>
          </div>
        )}

        <details className="mt-4 text-left text-sm">
          <summary className="cursor-pointer text-muted-foreground">Party 자세히</summary>
          <div className="mt-2 space-y-2">
            <p className="text-xs text-primary">Lv{party.progress.level} · Streak {party.progress.streak}</p>
            {mission ? (
              <p>🎯 {PartyMissionEngine.label(mission.missionId)} {mission.current}/{mission.target}</p>
            ) : null}
            <PartyJourneyFeed partyId={party.id} compact />
          </div>
        </details>

        <PartyInvitePanel
          code={code}
          gameSlug={gameSlug}
          inviteReason={inviteReason}
          playerCount={members.length}
          maxPlayers={maxPlayers}
        />
        <p className="mt-3 truncate text-[10px] text-muted-foreground">{getPartyLinkUrl(code)}</p>
      </div>
    </Container>
  );
}
