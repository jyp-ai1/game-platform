"use client";

import { getDeviceId } from "@game-platform/game-sdk";
import { Button, Container } from "@game-platform/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getRoom, joinRoom, setPlayerReady } from "@/lib/multiplayer-rooms";

export function RoomLobby({ code }: { code: string }) {
  const [room, setRoom] = useState(() => joinRoom(code) ?? getRoom(code));

  useEffect(() => {
    const id = setInterval(() => {
      setRoom(getRoom(code));
    }, 1500);
    return () => clearInterval(id);
  }, [code]);

  if (!room) {
    return (
      <Container className="py-16 text-center">
        <p className="text-lg font-semibold">Room not found</p>
        <Button className="mt-4" nativeButton={false} render={<Link href="/games">Discover</Link>} />
      </Container>
    );
  }

  const me = room.players.find((p) => p.deviceId === getDeviceId());
  const allReady = room.players.length >= 2 && room.players.every((p) => p.ready);

  return (
    <Container className="max-w-lg py-10">
      <div className="rounded-3xl border border-primary/25 bg-card/80 p-6 backdrop-blur">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Room</p>
        <p className="text-3xl font-bold tracking-widest text-primary">{room.code}</p>
        <p className="mt-2 text-sm text-muted-foreground">{room.gameSlug}</p>

        <ul className="mt-6 space-y-2">
          {room.players.map((p) => (
            <li
              key={p.deviceId}
              className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
            >
              <span>{p.nickname}</span>
              <span className={p.ready ? "text-emerald-400" : "text-muted-foreground"}>
                {p.ready ? "Ready" : "…"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          {me && !me.ready ? (
            <Button
              size="sm"
              onClick={() => {
                setPlayerReady(code, true);
                setRoom(getRoom(code));
              }}
            >
              Ready
            </Button>
          ) : null}
          {allReady ? (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={`/games/${room.gameSlug}`}>Start</Link>}
            />
          ) : null}
        </div>
      </div>
    </Container>
  );
}
