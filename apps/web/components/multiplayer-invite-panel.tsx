"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Check, Copy, QrCode, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import {
  createRoom,
  getInviteUrl,
  getShareText,
  isMultiplayerGame,
  type MaxPlayers,
} from "@/lib/multiplayer-rooms";

export function MultiplayerInvitePanel({ game }: { game: Game }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState<MaxPlayers>(2);

  if (!isMultiplayerGame(game.slug)) return null;

  const inviteUrl = roomCode ? getInviteUrl(roomCode) : "";

  const handleCreate = useCallback(() => {
    const room = createRoom(game.slug, maxPlayers);
    setRoomCode(room.code);
  }, [game.slug, maxPlayers]);

  async function handleCopy() {
    if (!roomCode) return;
    await navigator.clipboard.writeText(getShareText(roomCode, game.slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card/50 p-5 backdrop-blur">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <h3 className="font-semibold">Invite Friends</h3>
      </div>

      <div className="mt-3 flex gap-2">
        {([2, 3, 4] as MaxPlayers[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setMaxPlayers(n)}
            className={`rounded-lg px-3 py-1 text-sm ${maxPlayers === n ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {n}P
          </button>
        ))}
      </div>

      {!roomCode ? (
        <Button className="mt-4" size="sm" onClick={handleCreate}>
          Create Room
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-2xl font-bold tracking-widest text-primary">{roomCode}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1">
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1"
                >
                  <QrCode className="size-3" /> QR
                </a>
              }
            />
            <Button size="sm" nativeButton={false} render={<Link href={`/room/${roomCode}`}>Join →</Link>} />
          </div>
          <p className="truncate text-xs text-muted-foreground">{inviteUrl}</p>
        </div>
      )}
    </section>
  );
}
