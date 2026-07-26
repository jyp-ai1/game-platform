"use client";

import { getDeviceId, useGameSDK, emitGameRetry } from "@game-platform/game-sdk";
import {
  buildMultiplayerResult,
  ensureRoom,
  finish,
  getRoom,
  joinRoomAsync,
  send,
  start,
  subscribeRoom,
} from "@game-platform/multiplayer-sdk";
import { Button, cn, ScoreBox } from "@game-platform/ui";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createInitialWorld,
  setInput,
  tickWorld,
  TICK_MS,
  WORLD_SIZE,
  type Direction,
  type SnakeIoWorld,
} from "./snake-io-engine";

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

/** Flagship Snake.io — 20P realtime via Replay.multiplayer */
export function SnakeIoGame() {
  const params = useSearchParams();
  const roomCode = params.get("room")?.toUpperCase() ?? "";
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<SnakeIoWorld | null>(null);
  const [connected, setConnected] = useState(false);
  const worldRef = useRef<SnakeIoWorld | null>(null);
  const deviceId = getDeviceId();

  const room = getRoom(roomCode);
  const isHost = room?.hostId === deviceId;

  useEffect(() => {
    if (!roomCode) return;
    let active = true;
    (async () => {
      await ensureRoom(roomCode);
      await joinRoomAsync(roomCode);
      const r = getRoom(roomCode);
      if (!r || !active) return;
      start(roomCode);
      setConnected(true);
    })();
    return () => { active = false; };
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !connected) return;
    const unsub = subscribeRoom(roomCode, (r) => {
      const state = r.gameState?.state as SnakeIoWorld | undefined;
      if (state) {
        worldRef.current = state;
        setWorld(state);
      } else if (!worldRef.current && r.players.length > 0) {
        const initial = createInitialWorld(r.players.map((p) => ({ deviceId: p.deviceId, nickname: p.nickname })));
        worldRef.current = initial;
        setWorld(initial);
        if (isHost) send(roomCode, "state", initial);
      }
    });
    return unsub;
  }, [roomCode, connected, isHost]);

  useEffect(() => {
    if (!roomCode || !isHost || !connected) return;
    const id = setInterval(() => {
      const r = getRoom(roomCode);
      const input = r?.gameState?.input as { deviceId: string; direction: Direction } | undefined;
      if (input && worldRef.current) setInput(worldRef.current, input.deviceId, input.direction);
      if (!worldRef.current) return;
      const next = tickWorld(structuredClone(worldRef.current));
      worldRef.current = next;
      send(roomCode, "state", next);
      setWorld(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [roomCode, isHost, connected]);

  const handleDirection = useCallback(
    (direction: Direction) => {
      if (!roomCode || !worldRef.current) return;
      if (isHost) {
        setInput(worldRef.current, deviceId, direction);
      } else {
        send(roomCode, "input", { deviceId, direction });
      }
    },
    [roomCode, isHost, deviceId]
  );

  useEffect(() => {
    if (!roomCode || isHost) return;
    const unsub = subscribeRoom(roomCode, (r) => {
      const state = r.gameState?.state as SnakeIoWorld | undefined;
      if (state) {
        worldRef.current = state;
        setWorld(state);
      }
    });
    return unsub;
  }, [roomCode, isHost]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = DIRECTION_KEYS[e.key];
      if (dir) {
        e.preventDefault();
        handleDirection(dir);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDirection]);

  const mySnake = world?.snakes[deviceId];
  const top10 = world?.rankings ?? [];

  function handleEnd() {
    if (!roomCode || !world) return;
    const scores: Record<string, number> = {};
    for (const s of Object.values(world.snakes)) scores[s.deviceId] = s.score;
    const winner = top10[0]?.deviceId ?? null;
    finish(roomCode, {
      roomCode,
      gameSlug: "snake",
      winnerId: winner,
      scores,
      finishedAt: new Date().toISOString(),
    });
    reportScore("snake", mySnake?.score ?? 0);
    buildMultiplayerResult(getRoom(roomCode)!);
  }

  if (!roomCode) {
    return <p className="text-center text-muted-foreground">Room code required</p>;
  }

  if (!connected || !world) {
    return <p className="text-center text-muted-foreground">Connecting to room {roomCode}…</p>;
  }

  const cellSize = Math.min(480 / WORLD_SIZE, 8);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-lg items-center justify-between">
        <ScoreBox label="Score" value={mySnake?.score ?? 0} />
        <ScoreBox label="Players" value={Object.keys(world.snakes).length} />
        <ScoreBox label="Rank" value={Math.max(1, top10.findIndex((r) => r.deviceId === deviceId) + 1)} />
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-muted"
        style={{ width: WORLD_SIZE * cellSize, height: WORLD_SIZE * cellSize }}
      >
        {world.food.map((f, i) => (
          <div
            key={`f-${i}`}
            className="absolute rounded-full bg-amber-400"
            style={{ left: f.x * cellSize, top: f.y * cellSize, width: cellSize - 1, height: cellSize - 1 }}
          />
        ))}
        {Object.values(world.snakes).map((snake) =>
          snake.segments.map((seg, i) => (
            <div
              key={`${snake.deviceId}-${i}`}
              className={cn("absolute rounded-[1px]", !snake.alive && "opacity-30")}
              style={{
                left: seg.x * cellSize,
                top: seg.y * cellSize,
                width: cellSize - 1,
                height: cellSize - 1,
                backgroundColor: i === 0 ? snake.color : `${snake.color}99`,
              }}
            />
          ))
        )}
      </div>

      <div className="grid w-full max-w-lg grid-cols-2 gap-4 text-sm">
        <div>
          <p className="mb-2 font-semibold">TOP 10</p>
          <ol className="space-y-1">
            {top10.map((r, i) => (
              <li key={r.deviceId} className={r.deviceId === deviceId ? "text-primary font-medium" : "text-muted-foreground"}>
                {i + 1}. {r.nickname} — {r.score}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{isHost ? "Host · Running tick" : "Client · Sending input"}</p>
          <Button variant="outline" onClick={() => emitGameRetry("snake")}>Retry</Button>
          <Button onClick={handleEnd}>End & Result</Button>
        </div>
      </div>
    </div>
  );
}
