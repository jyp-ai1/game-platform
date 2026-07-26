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
  isGlobalWorldRoom,
  joinRoomAsync,
  send,
  spectator,
  start,
  subscribeRoom,
} from "@game-platform/multiplayer-sdk";
import { completeMultiplayerMatch, getFriends } from "@game-platform/replay-engine/social";
import { Button, cn, ScoreBox } from "@game-platform/ui";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ReplayMoment } from "@game-platform/shared";
import {
  applyBlackHolePull,
  applyMatchIdentity,
  createInitialWorld,
  createScheduledEvent,
  getDeathPosition,
  getMyRank,
  getSpectatorTarget,
  lerpSegments,
  setBoost,
  setInput,
  spawnEventFood,
  spawnWorldBoss,
  tickWorld,
  type Direction,
  type SnakeIoWorld,
  type Vec,
} from "./snake-io-engine";
import {
  getActiveAnnouncements,
  initLivingWorld,
  isInSafeZone,
  startFoodStorm,
  tickLivingWorld,
} from "./snake-living-world";
import { resolveSnakeMatchRule } from "./snake-match-rules";
import {
  syncSnakePopulation,
  tickBotBrains,
  respawnDeadBots,
  countWorldSnakes,
  SNAKE_WORLD_TARGET,
  isBotSnake,
} from "./snake-ai-fill";
import {
  loadPersistedGlobalWorld,
  persistGlobalWorldState,
  getDisplayRankings,
  buildJoinBrief,
  warmGlobalWorld,
  type GlobalWorldJoinBrief,
} from "./snake-global-world";
import {
  flushSnakeTelemetry,
  markFirstFun,
  markFirstMove,
  markPlayerDeath,
  recordCrowdSample,
  recordFoodShortageTick,
  recordKillFeedEvent,
  recordPlaytestExit,
  recordSnakeBoost,
  recordSnakeBossKill,
  recordSnakeDeath,
  recordSnakeEvent,
  recordSnakeEventLocation,
  recordSnakeRematch,
  recordSpectatorRejoin,
  setTuringPromptBot,
  startSnakeTelemetry,
  recordGlobalWorldTick,
  tryRecordPostDeathAction,
} from "./snake-telemetry";
import { PlaytestHeatmap } from "./snake-playtest-heatmap";
import { PlaytestLog } from "./snake-playtest-log";
import { PlaytestObservation } from "./snake-playtest-observation";
import { PlaytestReport } from "./snake-playtest-report";
import { refreshWorldTuningFromTelemetry } from "./snake-balance-tuner";
import { recordSnakeSessionEnd } from "./snake-session-recap";
import { SNAKE_FEEL } from "./snake-feel-tuning";
import {
  playBoostSound,
  playDeathSound,
  playEatSound,
  playKillSound,
  shakeIntensity,
  spawnDeathBurst,
  spawnEatParticles,
  tickParticles,
  type Particle,
} from "./snake-feel";

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
  const [spectatorMode, setSpectatorMode] = useState<"top1" | "friend" | "free" | "boss">("top1");
  const [spectatorTarget, setSpectatorTarget] = useState<string | null>(null);
  const worldRef = useRef<SnakeIoWorld | null>(null);
  const prevAliveRef = useRef(true);
  const prevRankRef = useRef(99);
  const camRef = useRef({ x: 0, y: 0 });
  const prevSegmentsRef = useRef<Record<string, Vec[]>>({});
  const prevWorldRef = useRef<SnakeIoWorld | null>(null);
  const boostingRef = useRef(false);
  const shakeRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [renderAlpha, setRenderAlpha] = useState(1);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(0);
  const [cheerMsg, setCheerMsg] = useState<string | null>(null);
  const [joinBrief, setJoinBrief] = useState<GlobalWorldJoinBrief | null>(null);
  const sessionMomentsRef = useRef<ReplayMoment[]>([]);
  const prevTotalKillsRef = useRef(0);
  const sessionKillsRef = useRef<Record<string, number>>({});
  const sessionDeathsRef = useRef<Record<string, number>>({});
  const processedKillsRef = useRef<Set<string>>(new Set());
  const deviceId = getDeviceId();

  const room = getRoom(roomCode);
  const isGlobalWorld = isGlobalWorldRoom(roomCode, "snake");
  const humanCount = room?.players.length ?? 1;
  const worldPopulation = world ? countWorldSnakes(world) : (isGlobalWorld ? SNAKE_WORLD_TARGET : humanCount);
  const playerCount = worldPopulation;
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
  const matchRule = useMemo(() => resolveSnakeMatchRule(playerCount), [playerCount]);
  const friendIds = useMemo(() => getFriends().map((f) => f.deviceId), []);
  const watchId = spectatorMode === "boss" && world?.boss && !world.boss.defeated
    ? null
    : spectatorTarget ?? (world ? getSpectatorTarget(world, spectatorMode === "friend" ? undefined : deviceId, friendIds) : null);
  const watchSnake = watchId && world ? world.snakes[watchId] : null;
  const bossCam = spectatorMode === "boss" && world?.boss && !world.boss.defeated ? world.boss : null;
  const cameraHead = bossCam
    ? { x: bossCam.x, y: bossCam.y }
    : isSpectating
      ? watchSnake?.segments[0]
      : mySnake?.segments[0];
  const top10 = world ? getDisplayRankings(world, 10) : [];
  const myRank = world ? getMyRank(world, deviceId) : 0;
  const activeEvent = world?.events[0];
  const teams = useMemo(
    () => (roomCode ? Replay.multiplayer.team.get(roomCode) : []),
    [roomCode, world?.tick]
  );
  const announcements = world ? getActiveAnnouncements(world) : [];
  const latestKill = world?.killFeed[0];

  useEffect(() => {
    if (!latestKill) return;
    const key = `${latestKill.tick}-${latestKill.killerId}-${latestKill.victimId}`;
    if (processedKillsRef.current.has(key)) return;
    processedKillsRef.current.add(key);
    if (roomCode) markFirstFun(roomCode);
    if (latestKill.killerId === deviceId) {
      sessionKillsRef.current[latestKill.victimName] = (sessionKillsRef.current[latestKill.victimName] ?? 0) + 1;
    }
    if (latestKill.victimId === deviceId) {
      sessionDeathsRef.current[latestKill.killerName] = (sessionDeathsRef.current[latestKill.killerName] ?? 0) + 1;
    }
  }, [latestKill, deviceId]);

  useEffect(() => {
    if (spectatorMode === "friend") {
      setSpectatorTarget(getSpectatorTarget(worldRef.current, undefined, friendIds));
    } else if (spectatorMode === "top1") {
      setSpectatorTarget(getSpectatorTarget(worldRef.current));
    }
  }, [spectatorMode, world?.tick, friendIds]);

  useEffect(() => {
    Replay.Engine.enable({ gameSlug: "snake", multiplayer: true, party: true });
    if (typeof window !== "undefined") {
      const w = window as Window & {
        PlaytestLog?: typeof PlaytestLog;
        PlaytestHeatmap?: typeof PlaytestHeatmap;
        PlaytestObservation?: typeof PlaytestObservation;
        PlaytestReport?: typeof PlaytestReport;
      };
      w.PlaytestLog = PlaytestLog;
      w.PlaytestHeatmap = PlaytestHeatmap;
      w.PlaytestObservation = PlaytestObservation;
      w.PlaytestReport = PlaytestReport;
    }
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
      startSnakeTelemetry(roomCode, { isGlobalWorld, quickPlay: isGlobalWorld });
      refreshWorldTuningFromTelemetry();
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
      else if (!worldRef.current && isHost) {
        const cfg = Replay.multiplayer.balance("snake", isGlobalWorld ? SNAKE_WORLD_TARGET : Math.max(1, r.players.length));
        const obj = Replay.multiplayer.objectives.create(Replay.multiplayer.objectives.pick(isGlobalWorld ? SNAKE_WORLD_TARGET : Math.max(1, r.players.length)));
        const humans = r.players.map((p) => ({ deviceId: p.deviceId, nickname: p.nickname }));
        const persisted = isGlobalWorld ? loadPersistedGlobalWorld(roomCode) : null;
        let initial = persisted ?? createInitialWorld(humans, cfg);
        if (isGlobalWorld) {
          syncSnakePopulation(initial, humans, SNAKE_WORLD_TARGET);
          if (!persisted) warmGlobalWorld(initial);
        }
        initial.objective = obj;
        initLivingWorld(initial, resolveSnakeMatchRule(isGlobalWorld ? SNAKE_WORLD_TARGET : Math.max(1, r.players.length)));
        applyMatchIdentity(initial);
        sessionMomentsRef.current = [];
        worldRef.current = initial;
        setWorld(initial);
        if (isGlobalWorld) {
          setJoinBrief(buildJoinBrief(initial));
          setTimeout(() => setJoinBrief(null), 4500);
        }
        if (isHost) send(roomCode, "state", initial);
      }
    });
    return unsub;
  }, [roomCode, connected, isHost, isGlobalWorld]);

  useEffect(() => {
    if (!roomCode || !isHost || !connected) return;
    const tickMs = balance.physicsTickMs;
    const id = setInterval(() => {
      const r = getRoom(roomCode);
      const input = r?.gameState?.input as { deviceId: string; direction: Direction; boosting?: boolean } | undefined;
      if (input && worldRef.current && !isBotSnake(worldRef.current.snakes[input.deviceId])) {
        setInput(worldRef.current, input.deviceId, input.direction);
        setBoost(worldRef.current, input.deviceId, !!input.boosting);
      }
      if (!worldRef.current) return;

      const before = structuredClone(worldRef.current);
      let next = structuredClone(worldRef.current);

      if (isGlobalWorld && r) {
        syncSnakePopulation(next, r.players.map((p) => ({ deviceId: p.deviceId, nickname: p.nickname })), SNAKE_WORLD_TARGET);
        tickBotBrains(next);
        recordGlobalWorldTick(roomCode, {
          humans: r.players.length,
          bots: countWorldSnakes(next) - r.players.length,
          population: countWorldSnakes(next),
        });
      }
      next.config = {
        ...next.config,
        environment: EnvironmentEngine.resolve(playerCount, next.tick + 1),
      };

      if (ux.events) {
        next.events = ExperienceEngine.events.expire(next.events);
        next.expMultiplier = next.events.some((e) => e.kind === "double_exp") ? 2 : 1;
      }

      next = tickWorld(next);
      if (isGlobalWorld) {
        respawnDeadBots(next, SNAKE_WORLD_TARGET);
        persistGlobalWorldState(roomCode, next);
      }
      tickLivingWorld(next, playerCount);

      if (ux.events) {
        const evt = ExperienceEngine.events.roll(playerCount, next.config.worldSize, next.tick, next.events);
        if (evt) {
          next.events = [evt, ...next.events];
          spawnEventFood(next, evt);
          if (evt.kind === "boss_spawn") spawnWorldBoss(next);
        }
        const scheduled = createScheduledEvent(next, playerCount);
        if (scheduled) {
          next.events = [scheduled, ...next.events];
          spawnEventFood(next, scheduled);
          if (scheduled.kind === "boss_spawn") spawnWorldBoss(next);
          if (scheduled.kind === "food_storm") startFoodStorm(next);
          recordSnakeEvent(roomCode, scheduled.kind);
          recordSnakeEventLocation(roomCode, scheduled.x, scheduled.y, scheduled.kind);
        }
        for (const e of next.events) applyBlackHolePull(next, e);
      }

      if (before.boss && !before.boss.defeated && next.boss?.defeated) {
        const m = Replay.multiplayer.moments.capture("boss_slayer", deviceId, next.boss.label, next.tick, { boss: true });
        next.moments = [m, ...next.moments].slice(0, 5);
        recordSnakeBossKill(roomCode);
      }

      const SURVIVAL_TICKS = Math.round(300_000 / balance.physicsTickMs);
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

      if (next.food.length < next.config.foodCount * 0.3) {
        recordFoodShortageTick(roomCode);
      }
      if (next.tick % 45 === 0) {
        const heads = Object.values(next.snakes)
          .filter((s) => s.alive && s.segments[0])
          .map((s) => s.segments[0]!);
        recordCrowdSample(roomCode, heads, next.tick);
      }
      const feedHead = next.killFeed[0];
      const prevFeedHead = before.killFeed[0];
      if (feedHead && (!prevFeedHead || feedHead.tick !== prevFeedHead.tick)) {
        recordKillFeedEvent(roomCode);
      }

      for (const [id, snake] of Object.entries(next.snakes)) {
        const prev = before.snakes[id];
        const lastFeed = next.killFeed[0];
        if (prev?.alive && !snake.alive) {
          const pos = getDeathPosition(prev);
          if (pos) {
            Replay.multiplayer.analytics.death(roomCode, { deviceId: id, x: pos.x, y: pos.y, tick: next.tick, cause: "player" });
            recordSnakeDeath(roomCode, pos.x, pos.y, "player");
          }
        }
        if (prev && (prev.totalKills ?? 0) < 1 && (snake.totalKills ?? 0) >= 1) {
          const m = Replay.multiplayer.moments.capture("first_kill", id, snake.nickname, next.tick);
          next.moments = [m, ...next.moments].slice(0, 5);
        }
        if ((prev?.killStreak ?? 0) < 3 && (snake.killStreak ?? 0) >= 3) {
          const m = Replay.multiplayer.moments.capture("triple_kill", id, snake.nickname, next.tick);
          next.moments = [m, ...next.moments].slice(0, 5);
        }
        if (lastFeed && lastFeed.killerId === id && lastFeed.tick === next.tick) {
          const victim = before.snakes[lastFeed.victimId];
          const killerBefore = before.snakes[id];
          if (victim && killerBefore && victim.score >= killerBefore.score * 1.5 && victim.score >= 50) {
            const m = Replay.multiplayer.moments.capture("giant_slayer", id, snake.nickname, next.tick, { victimScore: victim.score });
            next.moments = [m, ...next.moments].slice(0, 5);
          }
          if (killerBefore?.lastKillerId === lastFeed.victimId) {
            const m = Replay.multiplayer.moments.capture("revenge", id, snake.nickname, next.tick);
            next.moments = [m, ...next.moments].slice(0, 5);
          }
        }
        if (snake.alive && (snake.aliveSinceTick ?? 0) > 0 && next.tick - (snake.aliveSinceTick ?? 0) >= SURVIVAL_TICKS) {
          if (!(snake as { survivalMoment?: boolean }).survivalMoment) {
            (snake as { survivalMoment?: boolean }).survivalMoment = true;
            const m = Replay.multiplayer.moments.capture("survival_5min", id, snake.nickname, next.tick);
            next.moments = [m, ...next.moments].slice(0, 5);
          }
        }
        if (snake.boosting) recordSnakeBoost(roomCode);
        if (snake.score > 0) Replay.multiplayer.team.score(roomCode, id, snake.score - (prev?.score ?? 0));
      }

      const rank = getMyRank(next, deviceId);
      if (prevRankRef.current > 10 && rank <= 10) {
        const m = Replay.multiplayer.moments.capture("top10_entry", deviceId, mySnake?.nickname ?? "Player", next.tick);
        next.moments = [m, ...next.moments].slice(0, 5);
      }

      worldRef.current = next;
      if (next.moments.length > 0) {
        sessionMomentsRef.current = [
          ...next.moments,
          ...sessionMomentsRef.current.filter((m) => !next.moments.some((n) => n.id === m.id)),
        ].slice(0, 20);
      }
      send(roomCode, "state", next);
      setWorld(next);
    }, tickMs);
    return () => clearInterval(id);
  }, [roomCode, isHost, connected, isGlobalWorld, balance.physicsTickMs, ux.events, playerCount, deviceId, mySnake?.nickname]);

  useEffect(() => {
    if (!mySnake) return;
    if (prevAliveRef.current && !mySnake.alive) {
      markPlayerDeath(roomCode);
      recordPlaytestExit(roomCode, "death");
      setSpectatorTarget(getSpectatorTarget(worldRef.current, undefined, friendIds));
      spectator(roomCode);
      recordPlaytestExit(roomCode, "spectator");
    }
    prevAliveRef.current = mySnake.alive;
    if (world) prevRankRef.current = getMyRank(world, deviceId);
  }, [mySnake?.alive, mySnake, roomCode, world, deviceId, friendIds]);

  const postDeath = useCallback(
    (action: "exit" | "replay" | "spectator" | "invite") => {
      if (roomCode) tryRecordPostDeathAction(roomCode, action);
    },
    [roomCode]
  );

  const handleDirection = useCallback((direction: Direction) => {
    if (!roomCode || !worldRef.current || isSpectating) return;
    markFirstMove(roomCode);
    const payload = { deviceId, direction, boosting: boostingRef.current };
    if (isHost) {
      setInput(worldRef.current, deviceId, direction);
      setBoost(worldRef.current, deviceId, boostingRef.current);
    } else {
      send(roomCode, "input", payload);
    }
  }, [roomCode, isHost, deviceId, isSpectating]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const dir = DIRECTION_KEYS[e.key];
      if (dir) { e.preventDefault(); handleDirection(dir); return; }
      if (e.code === "Space" && !isSpectating) {
        e.preventDefault();
        if (!boostingRef.current) playBoostSound();
        boostingRef.current = true;
        if (isHost && worldRef.current) setBoost(worldRef.current, deviceId, true);
        else if (roomCode) send(roomCode, "input", { deviceId, direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right", boosting: true });
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        boostingRef.current = false;
        if (isHost && worldRef.current) setBoost(worldRef.current, deviceId, false);
        else if (roomCode) send(roomCode, "input", { deviceId, direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right", boosting: false });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleDirection, isSpectating, isHost, deviceId, roomCode]);

  useEffect(() => {
    if (!world) return;
    const prev = prevWorldRef.current;
    if (prev && prev.tick !== world.tick) {
      prevSegmentsRef.current = Object.fromEntries(
        Object.entries(prev.snakes).map(([id, s]) => [id, s.segments.map((v) => ({ ...v }))])
      );
      setRenderAlpha(0);
      const me = world.snakes[deviceId];
      const prevMe = prev.snakes[deviceId];
      if (prevMe && me && me.score > prevMe.score && me.segments[0]) {
        playEatSound("normal");
        markFirstFun(roomCode);
        setParticles((p) => spawnEatParticles(p, me.segments[0]!.x, me.segments[0]!.y, me.color));
      }
      if (prevMe?.alive && !me?.alive && prevMe.segments[0]) {
        playDeathSound();
        setParticles((p) => spawnDeathBurst(p, prevMe.segments[0]!.x, prevMe.segments[0]!.y, prevMe.color));
        shakeRef.current = SNAKE_FEEL.deathShakeImpulse;
      }
      const kills = me?.totalKills ?? 0;
      if (kills > prevTotalKillsRef.current && me?.segments[0]) {
        playKillSound(prevTotalKillsRef.current === 0);
        shakeRef.current = SNAKE_FEEL.killShakeImpulse;
      }
      prevTotalKillsRef.current = kills;
    }
    prevWorldRef.current = world;
  }, [world, deviceId]);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      setRenderAlpha((a) => Math.min(1, a + SNAKE_FEEL.segmentLerpStep));
      setParticles((p) => tickParticles(p));
      shakeRef.current = shakeIntensity(shakeRef.current);
      setShake(shakeRef.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    const onLeave = () => postDeath("exit");
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [roomCode, postDeath]);

  useEffect(() => {
    if (!isSpectating || !roomCode) return;
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      const href = anchor?.getAttribute("href") ?? "";
      if (href.includes("/community") || href.startsWith("/p/")) {
        postDeath("invite");
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isSpectating, roomCode, postDeath]);

  async function finishMatch() {
    if (!roomCode || !world) return;
    const bots = Object.values(world.snakes).filter((s) => isBotSnake(s));
    if (bots.length > 0) {
      setTuringPromptBot(roomCode, bots[Math.floor(Math.random() * bots.length)]!.nickname);
    }
    recordPlaytestExit(roomCode, "end");
    postDeath("exit");
    const scores: Record<string, number> = {};
    for (const s of Object.values(world.snakes)) scores[s.deviceId] = s.score;
    finish(roomCode, { roomCode, gameSlug: "snake", winnerId: world.rankings[0]?.deviceId ?? null, scores, finishedAt: new Date().toISOString() });
    reportScore("snake", mySnake?.score ?? 0);
    Replay.multiplayer.analytics.flush(roomCode, world.config.worldSize);
    const telem = flushSnakeTelemetry(roomCode);
    refreshWorldTuningFromTelemetry();
    const room = getRoom(roomCode);
    if (room) {
      recordSnakeSessionEnd({
        won: world.rankings[0]?.deviceId === deviceId,
        survivalMs: telem?.survivalMs ?? 0,
        killsAgainst: { ...sessionKillsRef.current },
        deathsFrom: { ...sessionDeathsRef.current },
        coPlayers: room.players.map((p) => p.nickname),
      });
    }
    if (room && typeof window !== "undefined") {
      const loop = await completeMultiplayerMatch(room);
      window.dispatchEvent(new CustomEvent("replay:viral-loop-complete", { detail: loop }));
    }
  }

  function handleEnd() {
    void finishMatch();
  }

  if (!roomCode) return <p className="text-center text-muted-foreground">Room code required</p>;
  if (!connected || !world) return <p className="text-center text-muted-foreground">Connecting… {ux.label} · {playerCount}P</p>;

  const worldSize = world.config.worldSize;
  const isBoosting = mySnake?.boosting && mySnake.alive;
  const zoom = world.config.cameraZoom * matchRule.cameraZoomMult * (isBoosting ? SNAKE_FEEL.cameraBoostZoom : 1);
  const cellSize = (480 / (world.config.viewportCells ?? 80)) * zoom;
  const targetCamX = spectatorMode === "free"
    ? (worldSize * cellSize) / 2 - 240
    : cameraHead ? cameraHead.x * cellSize - 240 : camRef.current.x;
  const targetCamY = spectatorMode === "free"
    ? (worldSize * cellSize) / 2 - 240
    : cameraHead ? cameraHead.y * cellSize - 240 : camRef.current.y;
  camRef.current.x += (targetCamX - camRef.current.x) * SNAKE_FEEL.cameraFollowLerp;
  camRef.current.y += (targetCamY - camRef.current.y) * SNAKE_FEEL.cameraFollowLerp;
  const camX = camRef.current.x;
  const camY = camRef.current.y;

  return (
    <div className="flex flex-col items-center gap-4">
      {joinBrief ? (
        <div className="w-full max-w-lg rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-5 py-4 text-center animate-in fade-in">
          <p className="text-lg font-bold text-emerald-200">🟢 {joinBrief.population}명 LIVE</p>
          {joinBrief.eventHint ? (
            <p className="mt-1 text-sm text-amber-200">⚠ {joinBrief.eventHint}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
            TOP1 · {joinBrief.topName} ({joinBrief.topScore.toLocaleString()}점)
          </p>
          <p className="mt-2 text-xs text-emerald-300/80">바로 투입됩니다…</p>
        </div>
      ) : null}

      {announcements[0] ? (
        <div className={cn(
          "w-full max-w-lg rounded-xl border px-4 py-2 text-center text-sm font-bold animate-in fade-in",
          announcements[0].kind === "golden" && "border-yellow-400/50 bg-yellow-400/15 text-yellow-200",
          announcements[0].kind === "boss" && "border-red-500/50 bg-red-500/15 text-red-200",
          announcements[0].kind === "storm" && "border-sky-400/50 bg-sky-400/15 text-sky-200",
          announcements[0].kind === "collapse" && "border-orange-500/50 bg-orange-500/15 text-orange-200",
          announcements[0].kind === "safe" && "border-emerald-400/50 bg-emerald-400/15 text-emerald-200",
          !["golden", "boss", "storm", "collapse", "safe"].includes(announcements[0].kind) && "border-white/20 bg-white/5",
        )}>
          {announcements[0].message}
        </div>
      ) : null}

      {latestKill ? (
        <div className="w-full max-w-lg rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-sm animate-in fade-in">
          <span className="font-bold text-red-300">{latestKill.killerName}</span>
          <span className="text-muted-foreground"> → </span>
          <span>{latestKill.victimName}</span>
        </div>
      ) : null}

      {teams.length > 1 ? (
        <div className="flex w-full max-w-lg flex-wrap gap-2">
          {teams.map((t) => (
            <div key={t.id} className="rounded-lg border border-white/10 px-3 py-1 text-xs">
              {t.name} · {t.score}
            </div>
          ))}
        </div>
      ) : null}

      {activeEvent ? (
        <div className="w-full max-w-lg rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-center text-sm font-medium animate-pulse">
          {Replay.multiplayer.events.label(activeEvent.kind)}
        </div>
      ) : null}

      <div className="flex w-full max-w-lg flex-wrap items-center gap-2 justify-between">
        <ScoreBox label="Score" value={mySnake?.score ?? 0} />
        <ScoreBox label={matchRule.label} value={playerCount} />
        <ScoreBox label="Stage" value={stage.id} />
        <ScoreBox label="HP" value={mySnake?.hp ?? 100} />
      </div>
      <p className="w-full max-w-lg text-center text-xs text-muted-foreground">{matchRule.description}</p>

      <div className="relative flex gap-3">
        <div
          className="relative overflow-hidden rounded-xl border border-white/10 touch-none"
          style={{
            width: 480,
            height: 480,
            backgroundColor: seasonStyle.bg,
            transform: shake > 0 ? `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)` : undefined,
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const start = touchStartRef.current;
            touchStartRef.current = null;
            const t = e.changedTouches[0];
            if (!start || !t) return;
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            if (Math.hypot(dx, dy) < SNAKE_FEEL.mobileSwipeThreshold) return;
            const dir: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
            handleDirection(dir);
          }}
        >
        <div className="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
          {isGlobalWorld ? (
            <span className="font-bold text-emerald-300">🟢 LIVE · {worldPopulation} / {SNAKE_WORLD_TARGET}</span>
          ) : (
            <span>{seasonStyle.label} · {balance.environment.weather} · {isBoosting ? "⚡ BOOST" : balance.environment.scaleTier}</span>
          )}
        </div>
        {isGlobalWorld ? (
          <div className="absolute right-2 top-2 z-10 w-28 rounded bg-black/60 px-2 py-1 text-[9px] text-white">
            <p className="font-semibold text-amber-300">TOP10</p>
            <ol className="mt-0.5 space-y-0.5">
            {top10.slice(0, 5).map((r, i) => (
              <li key={r.deviceId} className={r.deviceId === deviceId ? "text-primary font-bold" : r.isBot ? "text-white/60" : "text-white/80"}>
                {i + 1}. {r.nickname.length > 10 ? r.nickname.slice(0, 9) + "…" : r.nickname}
              </li>
            ))}
            </ol>
          </div>
        ) : null}
          <div className="absolute origin-top-left" style={{ width: worldSize * cellSize, height: worldSize * cellSize, transform: `translate(${-camX}px, ${-camY}px)` }}>
            {world.living?.collapseRadius != null ? (
              <div className="absolute rounded-full border-2 border-orange-500/40 pointer-events-none"
                style={{
                  left: (worldSize / 2 - world.living.collapseRadius) * cellSize,
                  top: (worldSize / 2 - world.living.collapseRadius) * cellSize,
                  width: world.living.collapseRadius * 2 * cellSize,
                  height: world.living.collapseRadius * 2 * cellSize,
                }} />
            ) : null}
            {world.living?.safeZone ? (
              <div className={cn(
                "absolute rounded-full border-2 pointer-events-none transition-all duration-1000",
                mySnake?.segments[0] && !isInSafeZone(world, mySnake.segments[0])
                  ? "border-red-400/60 bg-red-500/10 animate-pulse"
                  : "border-emerald-400/40 bg-emerald-500/10",
              )}
                style={{
                  left: (world.living.safeZone.x - world.living.safeZone.radius) * cellSize,
                  top: (world.living.safeZone.y - world.living.safeZone.radius) * cellSize,
                  width: world.living.safeZone.radius * 2 * cellSize,
                  height: world.living.safeZone.radius * 2 * cellSize,
                }} />
            ) : null}
            {world.living?.goldenSnake?.alive ? (
              <div className="absolute animate-pulse rounded-full border-2 border-yellow-300 bg-yellow-400/80 z-20"
                style={{
                  left: world.living.goldenSnake.x * cellSize,
                  top: world.living.goldenSnake.y * cellSize,
                  width: cellSize * 1.2,
                  height: cellSize * 1.2,
                  boxShadow: "0 0 16px #fde047",
                }} />
            ) : null}
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
            {Object.values(world.snakes).map((snake) => {
              const segs = lerpSegments(prevSegmentsRef.current[snake.deviceId], snake.segments, renderAlpha);
              return segs.map((seg, i) => (
              <div key={`${snake.deviceId}-${i}`} className={cn("absolute", (!snake.alive || snake.spectating) && "opacity-25", i === 0 && "z-10")}
                style={{
                  left: seg.x * cellSize, top: seg.y * cellSize,
                  width: i === 0 ? cellSize : cellSize - 1,
                  height: i === 0 ? cellSize : cellSize - 1,
                  backgroundColor: i === 0 ? snake.color : `${snake.color}99`,
                  boxShadow: i === 0
                    ? snake.invincibleUntil && Date.now() < snake.invincibleUntil
                      ? "0 0 10px white"
                      : snake.boosting
                        ? `0 0 12px ${snake.color}`
                        : `0 0 6px ${snake.color}`
                    : undefined,
                  borderRadius: i === 0 ? "40%" : "1px",
                  transition: "box-shadow 0.1s",
                }} />
            ));
            })}
            {particles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: p.x * cellSize,
                  top: p.y * cellSize,
                  width: p.size * p.life,
                  height: p.size * p.life,
                  backgroundColor: p.color,
                  opacity: p.life,
                }}
              />
            ))}
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

      {cheerMsg ? (
        <div className="w-full max-w-lg rounded-xl border border-amber-400/40 bg-amber-400/20 px-4 py-2 text-center text-lg font-bold animate-pulse">
          {cheerMsg}
        </div>
      ) : null}

      <div className="grid w-full max-w-lg grid-cols-2 gap-4 text-sm">
        <div>
          <p className="mb-2 font-semibold">{isGlobalWorld ? "GLOBAL RANK" : "TOP 10"}</p>
          <ol className="space-y-1">
            {top10.map((r, i) => (
              <li key={r.deviceId} className={r.deviceId === deviceId ? "font-medium text-primary" : r.isBot ? "text-muted-foreground/70" : "text-muted-foreground"}>
                {i + 1}. {r.nickname} — {r.score.toLocaleString()}
                {r.deviceId === deviceId ? " (YOU)" : ""}
              </li>
            ))}
          </ol>
          {myRank > 10 ? <p className="mt-2 text-primary">내 순위 #{myRank}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          {isSpectating ? (
            <>
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-center">
                <p className="text-sm font-bold">관전 중</p>
                <p className="mt-1 text-xs text-muted-foreground">한 판 더?</p>
              </div>
              <select className="rounded border bg-background px-2 py-1 text-xs" value={spectatorMode} onChange={(e) => { postDeath("spectator"); setSpectatorMode(e.target.value as typeof spectatorMode); }}>
                <option value="top1">TOP1 시점</option>
                <option value="friend">친구 시점</option>
                <option value="boss">Boss 추적</option>
                <option value="free">자유 카메라</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => {
                postDeath("spectator");
                setCheerMsg("🔥 응원!");
                setTimeout(() => setCheerMsg(null), 2000);
              }}>응원 🔥</Button>
              <Button variant="outline" size="sm" onClick={() => { postDeath("replay"); recordSnakeRematch(roomCode); emitGameRetry("snake"); }}>즉시 리매치</Button>
              <Button variant="outline" size="sm" onClick={() => { postDeath("replay"); recordSpectatorRejoin(roomCode); handleEnd(); }}>한 판 더! →</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => { postDeath("replay"); emitGameRetry("snake"); }}>Retry</Button>
          )}
          <Button onClick={() => { postDeath("exit"); handleEnd(); }}>End & Result</Button>
        </div>
      </div>
    </div>
  );
}
