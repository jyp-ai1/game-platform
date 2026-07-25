"use client";

import { getDeviceId } from "@game-platform/game-sdk";
import { Button, Container } from "@game-platform/ui";
import { Clock, Copy, Share2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getInviteUrl, getRoom, getShareText, joinRoom, setPlayerReady } from "@/lib/multiplayer-rooms";

export function RoomLobby({ code }: { code: string }) {
  const [room, setRoom] = useState(() => joinRoom(code) ?? getRoom(code));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setRoom(getRoom(code)), 1500);
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
  const waiting = room.maxPlayers - room.players.length;

  async function handleCopy() {
    await navigator.clipboard.writeText(getShareText(code, room!.gameSlug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    const url = getInviteUrl(code);
    if (navigator.share) {
      await navigator.share({ title: `Room ${code}`, url, text: getShareText(code, room!.gameSlug) });
    } else {
      await handleCopy();
    }
  }

  return (
    <Container className="max-w-lg py-10">
      <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-card/90 to-primary/5 p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Users className="size-4" /> Waiting Room
        </div>
        <p className="mt-2 text-3xl font-bold tracking-widest text-primary">{room.code}</p>
        <p className="mt-1 text-sm capitalize text-muted-foreground">{room.gameSlug.replace(/-/g, " ")}</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-amber-400">
          <Clock className="size-3" />
          {waiting > 0 ? `${waiting} more player(s) needed` : "Room full — get ready!"}
        </p>

        <ul className="mt-6 space-y-2">
          {Array.from({ length: room.maxPlayers }).map((_, i) => {
            const p = room.players[i];
            return (
              <li
                key={p?.deviceId ?? `slot-${i}`}
                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <span>{p?.nickname ?? `Slot ${i + 1}`}</span>
                <span className={p?.ready ? "font-medium text-emerald-400" : "text-muted-foreground"}>
                  {p ? (p.ready ? "Ready ✓" : "Waiting…") : "Empty"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1">
            <Copy className="size-3" /> {copied ? "Copied" : "Copy Code"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleShare} className="gap-1">
            <Share2 className="size-3" /> Share
          </Button>
        </div>

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
              render={<Link href={`/games/${room.gameSlug}`}>Start Game</Link>}
            />
          ) : (
            <p className="text-xs text-muted-foreground">All players must ready up to start.</p>
          )}
        </div>
      </div>
    </Container>
  );
}
