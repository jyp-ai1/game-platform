"use client";

import { getDeviceId, useGameSDK, emitGameRetry } from "@game-platform/game-sdk";
import { Replay } from "@game-platform/replay-sdk";
import { BalanceEngine } from "@game-platform/replay-engine/balance";
import {
  buildMultiplayerResult,
  ensureRoom,
  finish,
  getRoom,
  joinRoomAsync,
  send,
  spectator,
  start,
  subscribeRoom,
} from "@game-platform/multiplayer-sdk";
import { Button, cn, ScoreBox } from "@game-platform/ui";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import snakeBalance from "./balance";
import {
  createInitialWorld,
  getDeathPosition,
  getMyRank,
  getSpectatorTarget,
  setInput,
  tickWorld,
  type Direction,
  type SnakeIoWorld,
} from "./snake-io-engine";

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

const FOOD_COLORS: Record<string, string> = {
  normal: "#fbbf24",
  golden_apple: "#fde047",
  meteor: "#f97316",
  black_hole: "#6366f1",
};

const VIEWPORT_PX = 480;

/** Flagship Snake.io — Balance Engine + Replay.multiplayer */
export function SnakeIoGame() {
  const params = useSearchParams();
  const roomCode = params.get("room")?.toUpperCase() ?? "";
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<SnakeIoWorld | null>(null);
  const [connected, setConnected] = useState(false);
  const [spectatorTarget, setSpectatorTarget] = useState<string | null>(null);
  const worldRef = useRef<SnakeIoWorld | null>(null);
  const prevAliveRef = useRef(true);
  const deviceId = getDeviceId();

  const room = getRoom(roomCode);
  const playerCount = room?.players.length ?? 1;
  const balance = useMemo(() => Replay.multiplayer.balance("snake", playerCount), [playerCount]);
  const isHost = room?.hostId === deviceId;
  const mySnake = world?.snakes[deviceId];
  const isSpectating = mySnake?.spectating && !mySnake?.alive;
  const watchId = spectatorTarget ?? (world ? getSpectatorTarget(world, deviceId) : null);
  const watchSnake = watchId && world ? world.snakes[watchId] : null;
  const cameraHead = isSpectating ? watchSnake?.segments[0] : mySnake?.segments[0];

  const top10 = world?.rankings.slice(0, 10) ?? [];
  const myRank = world ? getMyRank(world, deviceId) : 0;
  const showMyRankOutsideTop10 = playerCount >= 20 && myRank > 10;

  useEffect(() => {
    if (!roomCode) return;
    let active = true;
    (async () => {
      await ensureRoom(roomCode);
      await joinRoomAsync(roomCode);
      const r = getRoom(roomCode);
      if (!r || !active) return;
      start(roomCode);
      BalanceEngine.analytics.start(roomCode, "snake", r.players.length);
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
        const cfg = Replay.multiplayer.balance("snake", r.players.length);
        const initial = createInitialWorld(
          r.players.map((p) => ({ deviceId: p.deviceId, nickname: p.nickname })),
          cfg
        );
        worldRef.current = initial;
        setWorld(initial);
        if (isHost) send(roomCode, "state", initial);
      }
    });
    return unsub;
  }, [roomCode, connected, isHost]);

  useEffect(() => {
    if (!roomCode || !isHost || !connected) return;
    const tickMs = balance.physicsTickMs;
    const id = setInterval(() => {
      const r = getRoom(roomCode);
      const input = r?.gameState?.input as { deviceId: string; direction: Direction } | undefined;
      if (input && worldRef.current) setInput(worldRef.current, input.deviceId, input.direction);
      if (!worldRef.current) return;

      const before = structuredClone(worldRef.current);
      const next = tickWorld(structuredClone(worldRef.current));

      for (const [id, snake] of Object.entries(next.snakes)) {
        const prev = before.snakes[id];
        if (prev?.alive && !snake.alive) {
          const pos = getDeathPosition(prev);
          if (pos) BalanceEngine.analytics.death(roomCode, { deviceId: id, x: pos.x, y: pos.y, tick: next.tick, cause: "player" });
        }
        if (!prev?.alive && snake.alive) BalanceEngine.analytics.respawn(roomCode);
      }
      if (next.food.length < next.config.foodCount * 0.3) {
        BalanceEngine.analytics.foodShortage(roomCode);
      }

      worldRef.current = next;
      send(roomCode, "state", next);
      setWorld(next);
    }, tickMs);
    return () => clearInterval(id);
  }, [roomCode, isHost, connected, balance.physicsTickMs]);

  useEffect(() => {
    if (!mySnake) return;
    if (prevAliveRef.current && !mySnake.alive) {
      setSpectatorTarget(worldRef.current ? getSpectatorTarget(worldRef.current) : null);
      spectator(roomCode);
    }
    prevAliveRef.current = mySnake.alive;
  }, [mySnake?.alive, mySnake, roomCode]);

  const handleDirection = useCallback(
    (direction: Direction) => {
      if (!roomCode || !worldRef.current || isSpectating) return;
      if (isHost) setInput(worldRef.current, deviceId, direction);
      else send(roomCode, "input", { deviceId, direction });
    },
    [roomCode, isHost, deviceId, isSpectating]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = DIRECTION_KEYS[e.key];
      if (dir) { e.preventDefault(); handleDirection(dir); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDirection]);

  function handleEnd() {
    if (!roomCode || !world) return;
    const scores: Record<string, number> = {};
    for (const s of Object.values(world.snakes)) scores[s.deviceId] = s.score;
    const winner = world.rankings[0]?.deviceId ?? null;
    finish(roomCode, { roomCode, gameSlug: "snake", winnerId: winner, scores, finishedAt: new Date().toISOString() });
    reportScore("snake", mySnake?.score ?? 0);
    buildMultiplayerResult(getRoom(roomCode)!);
    BalanceEngine.analytics.flush(roomCode, world.config.worldSize);
  }

  if (!roomCode) return <p className="text-center text-muted-foreground">Room code required</p>;
  if (!connected || !world) return <p className="text-center text-muted-foreground">Connecting… ({playerCount}P · map {balance.mapScale}x)</p>;

  const worldSize = world.config.worldSize;
  const zoom = world.config.cameraZoom;
  const cellSize = (VIEWPORT_PX / (world.config.viewportCells ?? 80)) * zoom;
  const camX = cameraHead ? cameraHead.x * cellSize - VIEWPORT_PX / 2 : 0;
  const camY = cameraHead ? cameraHead.y * cellSize - VIEWPORT_PX / 2 : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-lg flex-wrap items-center justify-between gap-2">
        <ScoreBox label="Score" value={mySnake?.score ?? 0} />
        <ScoreBox label="Players" value={playerCount} />
        <ScoreBox label="Map" value={worldSize} />
        <ScoreBox label="Food" value={world.food.length} />
        {isSpectating ? <span className="text-xs text-amber-400">Spectating {watchSnake?.nickname ?? "…"}</span> : null}
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-muted"
        style={{ width: VIEWPORT_PX, height: VIEWPORT_PX }}
      >
        <div
          className="absolute origin-top-left"
          style={{
            width: worldSize * cellSize,
            height: worldSize * cellSize,
            transform: `translate(${-camX}px, ${-camY}px)`,
          }}
        >
          {world.features.map((f, i) => (
            <div
              key={`f-${i}`}
              className={cn(
                "absolute opacity-40",
                f.type === "river" && "bg-sky-500/30",
                f.type === "wall" && "bg-stone-600/50",
                f.type === "boss_zone" && "border-2 border-dashed border-amber-400/50"
              )}
              style={{ left: f.x * cellSize, top: f.y * cellSize, width: (f.w ?? 1) * cellSize, height: (f.h ?? 1) * cellSize }}
            />
          ))}
          {world.food.map((f, i) => (
            <div
              key={`food-${i}`}
              className={cn("absolute rounded-full", f.kind !== "normal" && "animate-pulse ring-2 ring-white/30")}
              style={{
                left: f.x * cellSize, top: f.y * cellSize,
                width: cellSize - 1, height: cellSize - 1,
                backgroundColor: FOOD_COLORS[f.kind] ?? FOOD_COLORS.normal,
              }}
            />
          ))}
          {Object.values(world.snakes).map((snake) =>
            snake.segments.map((seg, i) => (
              <div
                key={`${snake.deviceId}-${i}`}
                className={cn("absolute rounded-[1px]", (!snake.alive || snake.spectating) && "opacity-25")}
                style={{
                  left: seg.x * cellSize, top: seg.y * cellSize,
                  width: cellSize - 1, height: cellSize - 1,
                  backgroundColor: i === 0 ? snake.color : `${snake.color}99`,
                  boxShadow: snake.invincibleUntil && Date.now() < snake.invincibleUntil ? "0 0 6px white" : undefined,
                }}
              />
            ))
          )}
        </div>
      </div>

      <div className="grid w-full max-w-lg grid-cols-2 gap-4 text-sm">
        <div>
          <p className="mb-2 font-semibold">TOP 10</p>
          <ol className="space-y-1">
            {top10.map((r, i) => (
              <li key={r.deviceId} className={r.deviceId === deviceId ? "font-medium text-primary" : "text-muted-foreground"}>
                {i + 1}. {r.nickname} — {r.score}
              </li>
            ))}
          </ol>
          {showMyRankOutsideTop10 ? (
            <p className="mt-2 text-primary">내 순위: #{myRank} — {mySnake?.score ?? 0}pt</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Balance · map {balance.mapScale.toFixed(1)}x · food {balance.foodScale.toFixed(1)}x · tick {balance.physicsTickMs}ms
          </p>
          {isSpectating ? (
            <>
              <Button variant="outline" onClick={() => setSpectatorTarget(getSpectatorTarget(world))}>Watch TOP1</Button>
              <Button variant="outline" onClick={() => emitGameRetry("snake")}>Retry</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => emitGameRetry("snake")}>Retry</Button>
          )}
          <Button onClick={handleEnd}>End & Result</Button>
        </div>
      </div>
    </div>
  );
}
