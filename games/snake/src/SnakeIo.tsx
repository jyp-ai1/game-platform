"use client";

import { getDeviceId, useGameSDK, emitGameRetry } from "@game-platform/game-sdk";
import { ExperienceEngine } from "@game-platform/replay-engine/experience";
import { EnvironmentEngine } from "@game-platform/replay-engine/balance";
import { Replay } from "@game-platform/replay-sdk";
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
import { completeMultiplayerMatch } from "@game-platform/replay-engine/social";
import { Button, cn, ScoreBox } from "@game-platform/ui";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  applyBlackHolePull,
  createInitialWorld,
  getDeathPosition,
  getMyRank,
  getSpectatorTarget,
  setInput,
  spawnEventFood,
  spawnWorldBoss,
  tickWorld,
  type Direction,
  type SnakeIoWorld,
} from "./snake-io-engine";

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

const FOOD_COLORS: Record<string, string> = {
  normal: "#fbbf24", golden_apple: "#fde047", meteor: "#f97316", black_hole: "#6366f1",
};

/** Flagship Snake.io — Events · Teams · Objectives · Spectator 2.0 */
export function SnakeIoGame() {
  const params = useSearchParams();
  const roomCode = params.get("room")?.toUpperCase() ?? "";
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<SnakeIoWorld | null>(null);
  const [connected, setConnected] = useState(false);
  const [spectatorMode, setSpectatorMode] = useState<"top1" | "friend" | "free">("top1");
  const [spectatorTarget, setSpectatorTarget] = useState<string | null>(null);
  const worldRef = useRef<SnakeIoWorld | null>(null);
  const prevAliveRef = useRef(true);
  const prevRankRef = useRef(99);
  const deviceId = getDeviceId();

  const room = getRoom(roomCode);
  const playerCount = room?.players.length ?? 1;
  const balance = useMemo(() => Replay.multiplayer.balance("snake", playerCount), [playerCount]);
  const ux = useMemo(() => Replay.multiplayer.ux(playerCount), [playerCount]);
  const season = useMemo(() => Replay.multiplayer.season.current(), []);
  const seasonStyle = Replay.multiplayer.season.palette[season];
  const stage = useMemo(
    () => Replay.multiplayer.progression.stageFor(Replay.multiplayer.progression.snake, world?.snakes[deviceId]?.score ?? 0),
    [world?.snakes[deviceId]?.score, deviceId]
  );
  const isHost = room?.hostId === deviceId;
  const mySnake = world?.snakes[deviceId];
  const isSpectating = mySnake?.spectating && !mySnake?.alive;
  const watchId = spectatorTarget ?? (world ? getSpectatorTarget(world, deviceId) : null);
  const watchSnake = watchId && world ? world.snakes[watchId] : null;
  const cameraHead = isSpectating ? watchSnake?.segments[0] : mySnake?.segments[0];
  const top10 = world?.rankings.slice(0, 10) ?? [];
  const myRank = world ? getMyRank(world, deviceId) : 0;
  const activeEvent = world?.events[0];

  useEffect(() => {
    Replay.Engine.enable({ gameSlug: "snake", multiplayer: true, party: true });
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    let active = true;
    (async () => {
      await ensureRoom(roomCode);
      await joinRoomAsync(roomCode);
      const r = getRoom(roomCode);
      if (!r || !active) return;
      start(roomCode);
      Replay.multiplayer.analytics.start(roomCode, "snake", r.players.length);
      Replay.multiplayer.team.create(roomCode, playerCount <= 2 ? "1v1" : playerCount <= 4 ? "2v2" : "party", r.players.map((p) => p.deviceId));
      setConnected(true);
    })();
    return () => { active = false; };
  }, [roomCode, playerCount]);

  useEffect(() => {
    if (!roomCode || !connected) return;
    const unsub = subscribeRoom(roomCode, (r) => {
      const state = r.gameState?.state as SnakeIoWorld | undefined;
      if (state) { worldRef.current = state; setWorld(state); }
      else if (!worldRef.current && r.players.length > 0) {
        const cfg = Replay.multiplayer.balance("snake", r.players.length);
        const obj = Replay.multiplayer.objectives.create(Replay.multiplayer.objectives.pick(r.players.length));
        const initial = createInitialWorld(r.players.map((p) => ({ deviceId: p.deviceId, nickname: p.nickname })), cfg);
        initial.objective = obj;
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
      let next = structuredClone(worldRef.current);
      next.config = {
        ...next.config,
        environment: EnvironmentEngine.resolve(playerCount, next.tick + 1),
      };

      if (ux.events) {
        next.events = ExperienceEngine.events.expire(next.events);
        next.expMultiplier = next.events.some((e) => e.kind === "double_exp") ? 2 : 1;
      }

      next = tickWorld(next);

      if (ux.events) {
        const evt = ExperienceEngine.events.roll(playerCount, next.config.worldSize, next.tick, next.events);
        if (evt) {
          next.events = [evt, ...next.events];
          spawnEventFood(next, evt);
          if (evt.kind === "boss_spawn") spawnWorldBoss(next);
        }
        for (const e of next.events) applyBlackHolePull(next, e);
      }

      if (before.boss && !before.boss.defeated && next.boss?.defeated) {
        const m = Replay.multiplayer.moments.capture("comeback", deviceId, next.boss.label, next.tick, { boss: true });
        next.moments = [m, ...next.moments].slice(0, 5);
      }

      const deaths = Object.keys(next.snakes).length;
      const alive = Object.values(next.snakes).filter((s) => s.alive).length;
      const director = Replay.multiplayer.director.run({
        playerCount,
        congestionScore: Math.round((deaths - alive) * 10),
        foodShortageTicks: next.food.length < next.config.foodCount * 0.3 ? 1 : 0,
        churnCount: 0,
        deathRate: 1 - alive / Math.max(1, deaths),
        avgFoodRatio: next.food.length / next.config.foodCount,
      });
      if (director.foodBoostPercent > 0 && next.tick % 60 === 0) {
        spawnEventFood(next, { id: "dir", kind: "treasure_chest", x: Math.floor(next.config.worldSize / 2), y: Math.floor(next.config.worldSize / 2), radius: 4, startedAt: Date.now(), expiresAt: Date.now() + 5000, announced: false });
      }

      for (const [id, snake] of Object.entries(next.snakes)) {
        const prev = before.snakes[id];
        if (prev?.alive && !snake.alive) {
          const pos = getDeathPosition(prev);
          if (pos) Replay.multiplayer.analytics.death(roomCode, { deviceId: id, x: pos.x, y: pos.y, tick: next.tick, cause: "player" });
        }
        if ((prev?.killStreak ?? 0) < 3 && (snake.killStreak ?? 0) >= 3) {
          const m = Replay.multiplayer.moments.capture("triple_kill", id, snake.nickname, next.tick);
          next.moments = [m, ...next.moments].slice(0, 5);
        }
        if (snake.score > 0) Replay.multiplayer.team.score(roomCode, id, snake.score - (prev?.score ?? 0));
      }

      const rank = getMyRank(next, deviceId);
      if (prevRankRef.current > 10 && rank <= 10) {
        const m = Replay.multiplayer.moments.capture("top10_entry", deviceId, mySnake?.nickname ?? "Player", next.tick);
        next.moments = [m, ...next.moments].slice(0, 5);
      }

      worldRef.current = next;
      send(roomCode, "state", next);
      setWorld(next);
    }, tickMs);
    return () => clearInterval(id);
  }, [roomCode, isHost, connected, balance.physicsTickMs, ux.events, playerCount, deviceId, mySnake?.nickname]);

  useEffect(() => {
    if (!mySnake) return;
    if (prevAliveRef.current && !mySnake.alive) {
      setSpectatorTarget(getSpectatorTarget(worldRef.current));
      spectator(roomCode);
    }
    prevAliveRef.current = mySnake.alive;
    if (world) prevRankRef.current = getMyRank(world, deviceId);
  }, [mySnake?.alive, mySnake, roomCode, world, deviceId]);

  const handleDirection = useCallback((direction: Direction) => {
    if (!roomCode || !worldRef.current || isSpectating) return;
    if (isHost) setInput(worldRef.current, deviceId, direction);
    else send(roomCode, "input", { deviceId, direction });
  }, [roomCode, isHost, deviceId, isSpectating]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = DIRECTION_KEYS[e.key];
      if (dir) { e.preventDefault(); handleDirection(dir); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleDirection]);

  async function handleEnd() {
    if (!roomCode || !world) return;
    const scores: Record<string, number> = {};
    for (const s of Object.values(world.snakes)) scores[s.deviceId] = s.score;
    finish(roomCode, { roomCode, gameSlug: "snake", winnerId: world.rankings[0]?.deviceId ?? null, scores, finishedAt: new Date().toISOString() });
    reportScore("snake", mySnake?.score ?? 0);
    Replay.multiplayer.analytics.flush(roomCode, world.config.worldSize);
    const room = getRoom(roomCode);
    if (room && typeof window !== "undefined") {
      const loop = await completeMultiplayerMatch(room);
      window.dispatchEvent(new CustomEvent("replay:viral-loop-complete", { detail: loop }));
    }
  }

  if (!roomCode) return <p className="text-center text-muted-foreground">Room code required</p>;
  if (!connected || !world) return <p className="text-center text-muted-foreground">Connecting… {ux.label} · {playerCount}P</p>;

  const worldSize = world.config.worldSize;
  const zoom = world.config.cameraZoom;
  const cellSize = (480 / (world.config.viewportCells ?? 80)) * zoom;
  const camX = cameraHead ? cameraHead.x * cellSize - 240 : 0;
  const camY = cameraHead ? cameraHead.y * cellSize - 240 : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {activeEvent ? (
        <div className="w-full max-w-lg rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-center text-sm font-medium animate-pulse">
          {Replay.multiplayer.events.label(activeEvent.kind)}
        </div>
      ) : null}

      <div className="flex w-full max-w-lg flex-wrap items-center gap-2 justify-between">
        <ScoreBox label="Score" value={mySnake?.score ?? 0} />
        <ScoreBox label={balance.matchType.toUpperCase()} value={playerCount} />
        <ScoreBox label="Stage" value={stage.id} />
        <ScoreBox label="Goal" value={world.objective.target} />
      </div>

      <div className="relative flex gap-3">
        <div
          className="relative overflow-hidden rounded-xl border border-white/10"
          style={{ width: 480, height: 480, backgroundColor: seasonStyle.bg }}
        >
        <div className="absolute left-2 top-2 z-10 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white">
          {seasonStyle.label} · {balance.environment.weather} · {balance.environment.dayPhase} · {balance.environment.scaleTier}
        </div>
          <div className="absolute origin-top-left" style={{ width: worldSize * cellSize, height: worldSize * cellSize, transform: `translate(${-camX}px, ${-camY}px)` }}>
            {world.features.map((f, i) => (
              <div key={i} className={cn("absolute opacity-40",
                f.type === "river" && "bg-sky-500/30",
                f.type === "wall" && "bg-stone-600/50",
                (f.type === "boss_zone" || f.type === "danger_zone") && "border-2 border-dashed border-amber-400/40",
                f.type === "safe_zone" && "border border-emerald-400/30 bg-emerald-500/10",
                f.type === "treasure_zone" && "border border-yellow-400/40 bg-yellow-500/10",
                f.type === "fog_zone" && "bg-slate-500/20",
                f.type === "biome" && "border border-white/10"
              )}
                style={{ left: f.x * cellSize, top: f.y * cellSize, width: (f.w ?? 1) * cellSize, height: (f.h ?? 1) * cellSize }} />
            ))}
            {world.events.map((e) => (
              <div key={e.id} className="absolute animate-pulse rounded-full border-2 border-amber-300/60"
                style={{ left: (e.x - e.radius) * cellSize, top: (e.y - e.radius) * cellSize, width: e.radius * 2 * cellSize, height: e.radius * 2 * cellSize }} />
            ))}
            {world.food.map((f, i) => (
              <div key={i} className={cn("absolute rounded-full", f.kind !== "normal" && "ring-2 ring-white/40 animate-pulse")}
                style={{ left: f.x * cellSize, top: f.y * cellSize, width: cellSize - 1, height: cellSize - 1, backgroundColor: FOOD_COLORS[f.kind] ?? FOOD_COLORS.normal }} />
            ))}
            {world.boss && !world.boss.defeated ? (
              <div className="absolute flex flex-col items-center" style={{ left: (world.boss.x - 2) * cellSize, top: (world.boss.y - 2) * cellSize, width: cellSize * 5, height: cellSize * 5 }}>
                <div className="absolute inset-0 animate-pulse rounded-full border-4 border-red-500/60 bg-red-500/20" />
                <div className="absolute -top-4 left-0 right-0 text-center text-[9px] font-bold text-red-300">{world.boss.label}</div>
                <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded bg-black/50">
                  <div className="h-full bg-red-500 transition-all" style={{ width: `${(world.boss.hp / world.boss.maxHp) * 100}%` }} />
                </div>
              </div>
            ) : null}
            {Object.values(world.snakes).map((snake) => snake.segments.map((seg, i) => (
              <div key={`${snake.deviceId}-${i}`} className={cn("absolute rounded-[1px]", (!snake.alive || snake.spectating) && "opacity-25")}
                style={{ left: seg.x * cellSize, top: seg.y * cellSize, width: cellSize - 1, height: cellSize - 1, backgroundColor: i === 0 ? snake.color : `${snake.color}99`, boxShadow: snake.invincibleUntil && Date.now() < snake.invincibleUntil ? "0 0 8px white" : undefined }} />
            )))}
          </div>
        </div>

        {ux.minimap ? (
          <div className="hidden w-24 shrink-0 rounded-xl border border-white/10 bg-black/40 p-1 sm:block">
            <p className="mb-1 text-[8px] text-muted-foreground">MINIMAP</p>
            <div className="relative aspect-square w-full">
              {Object.values(world.snakes).map((s) => s.segments[0] ? (
                <div key={s.deviceId} className="absolute size-1 rounded-full" style={{
                  left: `${(s.segments[0].x / worldSize) * 100}%`, top: `${(s.segments[0].y / worldSize) * 100}%`, backgroundColor: s.color,
                }} />
              ) : null)}
            </div>
          </div>
        ) : null}
      </div>

      {world.moments.length > 0 ? (
        <div className="w-full max-w-lg rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Replay Moment</p>
          <p className="mt-1 font-bold">{Replay.multiplayer.moments.labels[world.moments[0]!.kind]}</p>
          <p className="text-sm text-primary">{world.moments[0]!.nickname}</p>
        </div>
      ) : null}

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
          {playerCount >= 20 && myRank > 10 ? <p className="mt-2 text-primary">내 순위 #{myRank}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          {isSpectating ? (
            <>
              <select className="rounded border bg-background px-2 py-1 text-xs" value={spectatorMode} onChange={(e) => setSpectatorMode(e.target.value as typeof spectatorMode)}>
                <option value="top1">TOP1 시점</option>
                <option value="friend">친구 시점</option>
                <option value="free">자유 카메라</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => setSpectatorTarget(getSpectatorTarget(world))}>Watch TOP1</Button>
              <Button variant="outline" size="sm" onClick={() => emitGameRetry("snake")}>Retry</Button>
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
