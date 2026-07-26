"use client";

import { getDeviceId } from "@game-platform/game-sdk";
import {
  getPartyLinkUrl,
  getRoom,
  joinRoom,
  setPlayerReady,
  shareRoom,
  tickRoomCountdown,
} from "@game-platform/multiplayer-sdk";
import { Button, Container } from "@game-platform/ui";
import { Share2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Party Link lobby — guest instant join, no login required. */
export function PartyLinkLobby({ code }: { code: string }) {
  const [guestName, setGuestName] = useState("");
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState(() => getRoom(code));

  useEffect(() => {
    const id = setInterval(() => setRoom(getRoom(code)), 800);
    return () => clearInterval(id);
  }, [code]);

  const existing = room?.players.find((p) => p.deviceId === getDeviceId());
  const inRoom = joined || !!existing;
  const waiting = room ? room.maxPlayers - room.players.length : 0;
  const allReady = room ? room.players.length >= 2 && room.players.every((p) => p.ready) : false;

  useEffect(() => {
    if (!allReady || !room || room.status !== "ready" || room.countdown <= 0) return;
    const id = setInterval(() => {
      const next = tickRoomCountdown(code);
      if (next) setRoom({ ...next });
    }, 1000);
    return () => clearInterval(id);
  }, [allReady, code, room?.status, room?.countdown]);

  function handleJoin() {
    const next = joinRoom(code, { nickname: guestName.trim() || "Guest", isGuest: true });
    if (next) {
      setRoom(next);
      setJoined(true);
    }
  }

  function handleReady() {
    setPlayerReady(code, true);
    setRoom(getRoom(code));
  }

  if (!room) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-semibold">방을 찾을 수 없습니다</p>
        <p className="mt-2 text-sm text-muted-foreground">링크가 만료되었거나 잘못된 코드입니다.</p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/games">게임 둘러보기</Link>} />
      </Container>
    );
  }

  const gameStarted = room.status === "playing" || (allReady && room.countdown === 0);

  return (
    <Container className="flex min-h-[60vh] max-w-md flex-col justify-center py-10">
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card/90 p-8 text-center shadow-lg shadow-primary/10">
        <Users className="mx-auto size-8 text-primary" />
        <h1 className="mt-4 text-xl font-bold">친구가 기다립니다</h1>
        <p className="mt-1 capitalize text-muted-foreground">{room.gameSlug.replace(/-/g, " ")}</p>

        <p className="mt-6 text-4xl font-bold tabular-nums text-primary">
          {room.players.length} / {room.maxPlayers}
        </p>
        {waiting > 0 && !gameStarted ? (
          <p className="mt-1 text-sm text-amber-400">{waiting}명 더 필요</p>
        ) : null}

        {!inRoom ? (
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
              입장
            </Button>
            <p className="text-xs text-muted-foreground">로그인 없이 바로 플레이 · 나중에 계정 연결 가능</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <ul className="space-y-2 text-left">
              {room.players.map((p) => (
                <li
                  key={p.deviceId}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
                >
                  <span>{p.nickname}{p.isGuest ? " (Guest)" : ""}</span>
                  <span className={p.ready ? "text-emerald-400" : "text-muted-foreground"}>
                    {p.ready ? "Ready ✓" : "Waiting…"}
                  </span>
                </li>
              ))}
            </ul>

            {existing && !existing.ready && !gameStarted ? (
              <Button className="w-full" onClick={handleReady}>Ready</Button>
            ) : null}

            {gameStarted ? (
              <Button
                className="w-full"
                size="lg"
                nativeButton={false}
                render={<Link href={`/games/${room.gameSlug}?room=${code}`}>게임 시작 →</Link>}
              />
            ) : allReady && room.countdown > 0 ? (
              <p className="text-3xl font-bold tabular-nums text-primary">{room.countdown}</p>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => shareRoom(code, room.gameSlug, room)}
          >
            <Share2 className="size-3" /> 초대
          </Button>
        </div>
        <p className="mt-3 truncate text-[10px] text-muted-foreground">{getPartyLinkUrl(code)}</p>
      </div>
    </Container>
  );
}
