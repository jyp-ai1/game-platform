"use client";

import { getDeviceId, getLastNickname, useGameSDK, emitGameRetry } from "@game-platform/game-sdk";
import { ExperienceEngine } from "@game-platform/replay-engine/experience";
import { EnvironmentEngine } from "@game-platform/replay-engine/balance";
import { Replay } from "@game-platform/replay-sdk";
import {
  buildMultiplayerResult,
  ensureRoom,
  finish,
  getMultiplayerTransport,
  getRoom,
  isGlobalWorldRoom,
  joinRoomAsync,
  resolveAvailableCluster,
  send,
  spectator,
  start,
  subscribeRoom,
} from "@game-platform/multiplayer-sdk";
import { completeMultiplayerMatch, getFriends } from "@game-platform/replay-engine/social";
import { Button, cn } from "@game-platform/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GameRoom, ReplayMoment } from "@game-platform/shared";
import {
  applyBlackHolePull,
  applyMatchIdentity,
  createInitialWorld,
  createScheduledEvent,
  getDeathPosition,
  getMyRank,
  getSpectatorTarget,
  captureSnakeSnapshot,
  interpolateSnakeRender,
  getSegmentCount,
  lerpSegments,
  restartPlayerSnake,
  rehydrateWorldSnakes,
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
  ensureLocalSnake,
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
import { entryLog, entryLogFail, entryTrace } from "./snake-entry-log";
import { appendLifecycle } from "./entry-status-store";
import { recordJoinRoomDebug } from "./entry-status-store";
import { claimEngineSession } from "./snake-play-session";
import { resetGamePhase, transitionGamePhase, getGamePhase } from "./snake-game-state";
import {
  diagFrame,
  diagInput,
  diagRender,
  diagSimulation,
  diagTick,
  diagTickBlocked,
  diagTickError,
  diagTickMounted,
  diagWorldSnakes,
  initLoopDiag,
  shutdownLoopDiag,
} from "./snake-engine-diag";
import { isEngineAuditEnabled, recordSpawnAudit, updateEngineAudit } from "./snake-engine-audit-store";
import { PlaytestHeatmap } from "./snake-playtest-heatmap";
import { PlaytestLog } from "./snake-playtest-log";
import { PlaytestObservation } from "./snake-playtest-observation";
import { PlaytestReport } from "./snake-playtest-report";
import { refreshWorldTuningFromTelemetry } from "./snake-balance-tuner";
import { recordSnakeSessionEnd } from "./snake-session-recap";
import { SNAKE_FEEL } from "./snake-feel-tuning";
import { SNAKE_MVP_RC1, resolveSnakeHead } from "./snake-mvp-rc1";
import { getFoodVisual, tierFromKind } from "./snake-food-types";
import { SnakeMinimap } from "./snake-minimap";
import { SnakeMobileControls } from "./snake-mobile-controls";
import {
  playBoostSound,
  playDeathSound,
  playEatSound,
  playKillSound,
  playRareFoodSound,
  playRankUpSound,
  spawnBoostTrail,
  spawnDeathBurst,
  spawnEatParticles,
  spawnScorePopup,
  tickParticles,
  tickScorePopups,
  type Particle,
  type ScorePopup,
} from "./snake-feel";

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

/** Flagship Snake.io — Events · Teams · Objectives · Spectator 2.0 */
export function SnakeIoGame({
  practiceMode = false,
  onJoinTimeout,
}: {
  practiceMode?: boolean;
  onJoinTimeout?: () => void;
} = {}) {
  const params = useSearchParams();
  const roomCode = practiceMode ? "PRACTICE" : (params.get("room")?.toUpperCase() ?? "");
  const { reportScore } = useGameSDK();
  const [sessionRoom, setSessionRoom] = useState(roomCode);
  const [world, setWorld] = useState<SnakeIoWorld | null>(null);
  const [connected, setConnected] = useState(false);
  const [spectatorMode, setSpectatorMode] = useState<"top1" | "friend" | "free" | "boss">("top1");
  const [spectatorTarget, setSpectatorTarget] = useState<string | null>(null);
  const worldRef = useRef<SnakeIoWorld | null>(null);
  const prevAliveRef = useRef(true);
  const prevRankRef = useRef(99);
  const camRef = useRef({ x: 0, y: 0 });
  const zoomMultRef = useRef(1);
  const boardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(480);
  const prevSegmentsRef = useRef<Record<string, Vec[]>>({});
  const prevSnakeSnapRef = useRef<Record<string, ReturnType<typeof captureSnakeSnapshot>>>({});
  const prevWorldRef = useRef<SnakeIoWorld | null>(null);
  const boostingRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const inputLoggedRef = useRef(false);
  const awaitingInputRef = useRef(true);
  const [awaitingInput, setAwaitingInput] = useState(true);
  const [spawnHighlightUntil, setSpawnHighlightUntil] = useState(0);
  const [goFlashUntil, setGoFlashUntil] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderAlpha, setRenderAlpha] = useState(1);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const prevSegCountRef = useRef<Record<string, number>>({});
  const growthUntilRef = useRef<Record<string, number>>({});
  const [cheerMsg, setCheerMsg] = useState<string | null>(null);
  const [joinBrief, setJoinBrief] = useState<GlobalWorldJoinBrief | null>(null);
  const sessionMomentsRef = useRef<ReplayMoment[]>([]);
  const prevTotalKillsRef = useRef(0);
  const sessionKillsRef = useRef<Record<string, number>>({});
  const sessionDeathsRef = useRef<Record<string, number>>({});
  const processedKillsRef = useRef<Set<string>>(new Set());
  const deviceId = getDeviceId();
  const spawnTimeoutRef = useRef<number | undefined>(undefined);
  const onJoinTimeoutRef = useRef(onJoinTimeout);
  const gameReadyRef = useRef(false);
  const connectDoneRef = useRef(false);
  const tickEpochRef = useRef(0);
  const [tickEpoch, setTickEpoch] = useState(0);
  const playerCountRef = useRef(1);
  const prevWorldTickRef = useRef({ tick: 0, at: 0 });
  const camLayoutRef = useRef({ boardPx: 480, cellSize: 10, camHalf: 240 });
  onJoinTimeoutRef.current = onJoinTimeout;

  const effectiveRoomCode = sessionRoom || roomCode;
  const activeRoom = effectiveRoomCode;
  const room = getRoom(activeRoom);
  const isGlobalWorld = isGlobalWorldRoom(effectiveRoomCode, "snake");
  const humanCount = room?.players.length ?? 1;
  const worldPopulation = world ? countWorldSnakes(world) : (isGlobalWorld ? SNAKE_WORLD_TARGET : humanCount);
  const playerCount = worldPopulation;
  playerCountRef.current = playerCount;
  const balance = useMemo(() => Replay.multiplayer.balance("snake", playerCount), [playerCount]);
  const ux = useMemo(() => Replay.multiplayer.ux(playerCount), [playerCount]);
  const season = useMemo(() => Replay.multiplayer.season.current(), []);
  const seasonStyle = Replay.multiplayer.season.palette[season];
  const stage = useMemo(
    () => Replay.multiplayer.progression.stageFor(Replay.multiplayer.progression.snake, world?.snakes[deviceId]?.score ?? 0),
    [world?.snakes[deviceId]?.score, deviceId]
  );
  const isHost = practiceMode || room?.hostId === deviceId;
  const shouldTickWorld = practiceMode || isHost || isGlobalWorld;
  const mySnake = world?.snakes[deviceId];
  const isSpectating = mySnake?.spectating && !mySnake?.alive;
  const matchRule = useMemo(() => resolveSnakeMatchRule(playerCount), [playerCount]);
  const friendIds = useMemo(() => getFriends().map((f) => f.deviceId), []);
  const watchId = spectatorMode === "boss" && world?.boss && !world.boss.defeated
    ? null
    : spectatorTarget ?? (world ? getSpectatorTarget(world, spectatorMode === "friend" ? undefined : deviceId, friendIds) : null);
  const watchSnake = watchId && world ? world.snakes[watchId] : null;
  const bossCam = spectatorMode === "boss" && world?.boss && !world.boss.defeated ? world.boss : null;
  const cameraFallback = useMemo((): Vec | null => {
    if (!world) return null;
    const sz = world.living?.safeZone;
    if (sz) return { x: sz.x, y: sz.y };
    const mid = world.config.worldSize / 2;
    return { x: mid, y: mid };
  }, [world]);

  const localHead = useMemo((): Vec | null => {
    if (isSpectating || bossCam) return null;
    return resolveSnakeHead(worldRef.current?.snakes[deviceId] ?? mySnake);
  }, [world?.tick, mySnake, deviceId, isSpectating, bossCam]);

  const cameraHead = bossCam
    ? { x: bossCam.x, y: bossCam.y }
    : isSpectating
      ? resolveSnakeHead(watchSnake ?? undefined)
      : localHead ?? cameraFallback ?? undefined;
  const top10 = world ? getDisplayRankings(world, 10) : [];
  const myRank = world ? getMyRank(world, deviceId) : 0;
  const activeEvent = world?.events[0];
  const teams = useMemo(
    () => (activeRoom ? Replay.multiplayer.team.get(activeRoom) : []),
    [activeRoom, world?.tick]
  );
  const announcements = world ? getActiveAnnouncements(world) : [];
  const latestKill = world?.killFeed[0];

  const beginSpawnReady = useCallback(() => {
    awaitingInputRef.current = true;
    setAwaitingInput(true);
    inputLoggedRef.current = false;
    setSpawnHighlightUntil(Date.now() + SNAKE_MVP_RC1.spawnHighlightMs);
    const snake = worldRef.current?.snakes[deviceId];
    if (snake) snake.awaitingInput = true;
    const head = resolveSnakeHead(snake ?? undefined);
    const layout = camLayoutRef.current;
    if (head && layout.cellSize > 0) {
      camRef.current = {
        x: head.x * layout.cellSize - layout.camHalf,
        y: head.y * layout.cellSize - layout.camHalf,
      };
    } else {
      camRef.current = { x: 0, y: 0 };
    }
    transitionGamePhase("READY", "await-input");
    transitionGamePhase("COUNTDOWN", "await-input");
  }, [deviceId]);

  useEffect(() => {
    if (!latestKill) return;
    const key = `${latestKill.tick}-${latestKill.killerId}-${latestKill.victimId}`;
    if (processedKillsRef.current.has(key)) return;
    processedKillsRef.current.add(key);
    if (activeRoom) markFirstFun(activeRoom);
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
    setSessionRoom(roomCode);
    gameReadyRef.current = false;
    connectDoneRef.current = false;
  }, [roomCode]);

  useEffect(() => {
    resetGamePhase();
    transitionGamePhase("INIT");
    entryLog("GAME_CREATE");
    if (claimEngineSession()) {
      entryLog("ENGINE_CREATE");
      entryLog("ENGINE_READY");
      Replay.Engine.enable({ gameSlug: "snake", multiplayer: true, party: true });
    }
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
    return () => {
      entryLog("GAME_DESTROY");
      entryLog("ENGINE_DESTROY");
    };
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth || window.innerWidth;
      const cap = Math.min(width, window.innerHeight * 0.65, SNAKE_FEEL.maxViewportPx);
      setBoardPx(Math.max(320, Math.floor(cap)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [connected, world]);

  useEffect(() => {
    if (practiceMode || roomCode) return;
    entryLogFail("JOIN", "missing room param");
    entryLog("PRACTICE_FALLBACK", "empty-room");
    onJoinTimeoutRef.current?.();
  }, [roomCode, practiceMode]);

  useEffect(() => {
    if (!roomCode) return;
    if (connectDoneRef.current) return;
    if (practiceMode) {
      connectDoneRef.current = true;
      entryLog("CONNECTING", "PRACTICE");
      const cfg = Replay.multiplayer.balance("snake", SNAKE_WORLD_TARGET);
      const humans = [{ deviceId, nickname: getLastNickname() || "Player" }];
      let initial = createInitialWorld(humans, cfg);
      syncSnakePopulation(initial, humans, SNAKE_WORLD_TARGET, deviceId);
      warmGlobalWorld(initial);
      initLivingWorld(initial, resolveSnakeMatchRule(SNAKE_WORLD_TARGET));
      applyMatchIdentity(initial);
      worldRef.current = initial;
      setWorld(initial);
      setConnected(true);
      entryLog("CONNECTED", "PRACTICE");
      entryLog("SPAWNED");
      entryLog("GAME_READY", "PRACTICE");
      return;
    }
    connectDoneRef.current = true;

    let active = true;
    const CONNECT_TIMEOUT_MS = 5000;
    const MAX_ATTEMPTS = 1;

    const finishConnect = (r: GameRoom, code: string): void => {
      if (code !== sessionRoom) setSessionRoom(code);
      start(code);
      entryTrace("CONNECT", "PASS", code);
      entryTrace("JOIN", "PASS", `${r.players.length} players`);
      const pop = isGlobalWorld ? SNAKE_WORLD_TARGET : Math.max(1, r.players.length);
      startSnakeTelemetry(code, { isGlobalWorld, quickPlay: isGlobalWorld });
      refreshWorldTuningFromTelemetry();
      Replay.multiplayer.analytics.start(code, "snake", r.players.length);
      Replay.multiplayer.team.create(
        code,
        pop <= 2 ? "1v1" : pop <= 4 ? "2v2" : "party",
        r.players.map((p) => p.deviceId)
      );
      setConnected(true);
      spawnTimeoutRef.current = window.setTimeout(() => {
        if (!active || worldRef.current) return;
        entryLogFail("SPAWN", `world not ready ${code}`, { room: code });
        onJoinTimeoutRef.current?.();
      }, 12_000);
    };

    const attemptConnect = async (attemptIndex: number): Promise<void> => {
      let targetCode = roomCode;
      if (isGlobalWorldRoom(roomCode, "snake") && roomCode === "WORLD") {
        try {
          targetCode = await resolveAvailableCluster("snake");
        } catch (err) {
          recordJoinRoomDebug({
            roomCode,
            returned: false,
            transport: getMultiplayerTransport().constructor.name,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      entryTrace("CONNECT", "START", attemptIndex > 0 ? `retry ${attemptIndex + 1}` : targetCode);
      let timedOut = false;
      let timeoutId: number | undefined;

      try {
        const existing = getRoom(targetCode);
        if (existing?.players.some((p) => p.deviceId === deviceId)) {
          if (!active) return;
          recordJoinRoomDebug({
            roomCode: targetCode,
            returned: true,
            playerId: deviceId,
            playerCount: existing.players.length,
            hostId: existing.hostId,
            transport: getMultiplayerTransport().constructor.name,
          });
          finishConnect(existing, targetCode);
          return;
        }

        await Promise.race([
          (async () => {
            try {
              await ensureRoom(targetCode);
              if (timedOut || !active) return;
              const joined = await joinRoomAsync(targetCode);
              recordJoinRoomDebug({
                roomCode: targetCode,
                returned: !!joined,
                playerId: joined?.players.find((p) => p.deviceId === deviceId)?.deviceId ?? deviceId,
                playerCount: joined?.players.length,
                hostId: joined?.hostId,
                transport: getMultiplayerTransport().constructor.name,
                error: joined ? undefined : "joinRoom returned null",
              });
              if (timedOut || !active) return;
              if (!joined) throw new Error("join returned no room");
              if (!joined.players.some((p) => p.deviceId === deviceId)) {
                throw new Error("player not in room after join");
              }
            } catch (e) {
              if (timedOut || !active) return;
              recordJoinRoomDebug({
                roomCode: targetCode,
                returned: false,
                playerId: deviceId,
                transport: getMultiplayerTransport().constructor.name,
                error: e instanceof Error ? e.message : String(e),
              });
              throw e;
            }
          })(),
          new Promise<never>((_, reject) => {
            timeoutId = window.setTimeout(() => {
              timedOut = true;
              reject(new Error("connect timeout"));
            }, CONNECT_TIMEOUT_MS);
          }),
        ]);

        if (timeoutId) window.clearTimeout(timeoutId);
        if (!active || timedOut) return;

        const r = getRoom(targetCode);
        if (!r) throw new Error("room missing after connect");
        finishConnect(r, targetCode);
      } catch (err) {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (!active) return;
        if (attemptIndex + 1 < MAX_ATTEMPTS) {
          entryTrace("RETRY", "PASS", `${targetCode} attempt ${attemptIndex + 2}`);
          await attemptConnect(attemptIndex + 1);
          return;
        }
        entryTrace(
          "CONNECT",
          "FAIL",
          err instanceof Error ? err.message : String(err)
        );
        entryLogFail(
          "CONNECT",
          err instanceof Error ? err.message : String(err),
          { room: targetCode, recordCrash: true }
        );
        connectDoneRef.current = false;
        onJoinTimeoutRef.current?.();
      }
    };

    void attemptConnect(0);
    return () => {
      active = false;
      if (spawnTimeoutRef.current) window.clearTimeout(spawnTimeoutRef.current);
    };
  }, [roomCode, practiceMode, deviceId]);

  useEffect(() => {
    if (!effectiveRoomCode || !connected || practiceMode) return;

    const humansForRoom = (r: GameRoom) => {
      const humans = r.players.map((p) => ({ deviceId: p.deviceId, nickname: p.nickname }));
      if (!humans.some((h) => h.deviceId === deviceId)) {
        humans.push({ deviceId, nickname: getLastNickname() || "Player" });
      }
      return humans;
    };

    const spawnTrace = (line: string) => {
      appendLifecycle(line);
      if (typeof console !== "undefined") console.info(`[SPAWN] ${line}`);
    };

    const attachLocalPlayer = (w: SnakeIoWorld, r: GameRoom): SnakeIoWorld => {
      spawnTrace("GAME_INIT");
      spawnTrace("PLAYER_REGISTER");
      const humans = humansForRoom(r);
      if (isGlobalWorld) {
        syncSnakePopulation(w, humans, SNAKE_WORLD_TARGET, deviceId);
      }
      rehydrateWorldSnakes(w);
      let me = w.snakes[deviceId];
      if (!me) {
        const idx = humans.findIndex((h) => h.deviceId === deviceId);
        me = ensureLocalSnake(w, deviceId, getLastNickname() || "Player", Math.max(0, idx));
        spawnTrace("PLAYER_CREATE retry ensureLocalSnake");
        recordSpawnAudit(`ensureLocalSnake len=${getSegmentCount(me)}`, true);
      }
      if (me) {
        spawnTrace("PLAYER_CREATE");
        spawnTrace(`SPAWN_SUCCESS len=${getSegmentCount(me)}`);
        recordSpawnAudit(`PLAYER_CREATE len=${getSegmentCount(me)}`, true);
      } else {
        spawnTrace("PLAYER_CREATE FAIL — missing after syncSnakePopulation");
        recordSpawnAudit("missing after syncSnakePopulation", false);
      }
      return w;
    };

    const applyRoom = (r: GameRoom) => {
      const state = r.gameState?.state as SnakeIoWorld | undefined;
      if (state) {
        if (isGlobalWorld) {
          const base = worldRef.current ?? structuredClone(state);
          const next = attachLocalPlayer(base, r);
          worldRef.current = next;
          setWorld(next);
          return;
        }
        worldRef.current = state;
        setWorld(state);
        return;
      }
      if (!worldRef.current && (isHost || isGlobalWorld)) {
        spawnTrace("SPAWN_REQUEST");
        const cfg = Replay.multiplayer.balance("snake", isGlobalWorld ? SNAKE_WORLD_TARGET : Math.max(1, r.players.length));
        const obj = Replay.multiplayer.objectives.create(Replay.multiplayer.objectives.pick(isGlobalWorld ? SNAKE_WORLD_TARGET : Math.max(1, r.players.length)));
        const humans = humansForRoom(r);
        const persisted = isGlobalWorld ? loadPersistedGlobalWorld(effectiveRoomCode) : null;
        let initial = persisted ?? createInitialWorld(humans, cfg);
        initial = attachLocalPlayer(initial, r);
        if (isGlobalWorld && !persisted) warmGlobalWorld(initial);
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
        if (isHost) send(effectiveRoomCode, "state", initial);
      }
    };
    const unsub = subscribeRoom(effectiveRoomCode, applyRoom);
    const current = getRoom(effectiveRoomCode);
    if (current) applyRoom(current);
    return unsub;
  }, [effectiveRoomCode, connected, isHost, isGlobalWorld, practiceMode, deviceId]);

  useEffect(() => {
    if (!world) return;
    if (gameReadyRef.current) return;
    gameReadyRef.current = true;
    if (spawnTimeoutRef.current) {
      window.clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = undefined;
    }
    entryTrace("SPAWN", "PASS");
    entryTrace("CANVAS", "PASS");
    entryTrace("GAME_READY", "PASS", activeRoom);
    appendLifecycle("STATE_READY");
    const me = world.snakes[deviceId];
    transitionGamePhase("READY", `alive=${me?.alive ?? "?"} len=${me ? getSegmentCount(me) : 0}`);
    beginSpawnReady();
  }, [world, activeRoom, deviceId, beginSpawnReady]);

  useEffect(() => {
    if (!connected || !world) transitionGamePhase("LOADING");
  }, [connected, world]);

  useEffect(() => {
    initLoopDiag();
    return () => shutdownLoopDiag();
  }, []);

  useEffect(() => {
    if (!isEngineAuditEnabled()) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const wt = world?.tick ?? worldRef.current?.tick ?? 0;
      const prev = prevWorldTickRef.current;
      const worldTickAdvancing = wt > prev.tick && now - prev.at < 3000;
      if (wt !== prev.tick) prevWorldTickRef.current = { tick: wt, at: now };

      const wr = worldRef.current;
      const me = world?.snakes[deviceId];
      const snakes = world ? Object.values(world.snakes) : [];
      let inputBlocked: string | null = null;
      if (!activeRoom) inputBlocked = "no activeRoom";
      else if (!wr) inputBlocked = "no worldRef";
      else if (!wr.snakes[deviceId]) inputBlocked = "no snake in worldRef";
      else if (isSpectating) inputBlocked = "spectating";

      updateEngineAudit({
        roomCode: activeRoom,
        players: room?.players.length ?? 0,
        connected,
        shouldTickWorld,
        isGlobalWorld,
        isHost,
        deviceId,
        registeredInRoom: room?.players.some((p) => p.deviceId === deviceId) ?? false,
        inWorldState: !!world?.snakes[deviceId],
        inWorldRef: !!wr?.snakes[deviceId],
        gamePhase: getGamePhase(),
        snakeExists: !!me,
        snakeAlive: me?.alive ?? false,
        snakeSegments: me ? getSegmentCount(me) : 0,
        snakeHead: me?.segments[0] ?? null,
        snakeTail: me?.segments.length ? me.segments[me.segments.length - 1]! : null,
        boost: boostingRef.current,
        inputBlockedReason: inputBlocked,
        tickHz: Math.round(1000 / balance.physicsTickMs),
        worldTick: wt,
        worldTickAdvancing,
        snakesAlive: snakes.filter((s) => s.alive).length,
        snakesTotal: snakes.length,
        foods: world?.food.length ?? 0,
        aiAlive: snakes.filter((s) => isBotSnake(s) && s.alive).length,
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [
    world,
    connected,
    activeRoom,
    room?.players.length,
    deviceId,
    shouldTickWorld,
    isGlobalWorld,
    isHost,
    isSpectating,
    balance.physicsTickMs,
  ]);

  useEffect(() => {
    if (!world) return;
    const alive = Object.values(world.snakes).filter((s) => s.alive).length;
    diagRender(alive, !!world.snakes[deviceId]);
    diagWorldSnakes(Object.keys(world.snakes).length, !!world.snakes[deviceId]);
  }, [world, deviceId]);

  useEffect(() => {
    if (!activeRoom || !shouldTickWorld || !connected) {
      const reasons: string[] = [];
      if (!activeRoom) reasons.push("no activeRoom");
      if (!shouldTickWorld) reasons.push("shouldTickWorld=false");
      if (!connected) reasons.push("not connected");
      diagTickBlocked(reasons.join(", ") || "unknown");
      return;
    }
    const epoch = tickEpoch;
    const tickMs = balance.physicsTickMs;
    diagTickMounted(tickMs);
    const id = setInterval(() => {
      try {
      if (epoch !== tickEpochRef.current) return;
      diagTick();
      const pc = playerCountRef.current;
      const r = getRoom(activeRoom);
      const input = r?.gameState?.input as { deviceId: string; direction: Direction; boosting?: boolean } | undefined;
      if (input && worldRef.current && !isBotSnake(worldRef.current.snakes[input.deviceId])) {
        setInput(worldRef.current, input.deviceId, input.direction);
        setBoost(worldRef.current, input.deviceId, !!input.boosting);
      }
      if (!worldRef.current) return;

      const before = structuredClone(worldRef.current);
      let next = structuredClone(worldRef.current);

      if (isGlobalWorld && r) {
        const humans = r.players.map((p) => ({ deviceId: p.deviceId, nickname: p.nickname }));
        if (!humans.some((h) => h.deviceId === deviceId)) {
          humans.push({ deviceId, nickname: getLastNickname() || "Player" });
        }
        syncSnakePopulation(next, humans, SNAKE_WORLD_TARGET, deviceId);
        rehydrateWorldSnakes(next);
        if (!next.snakes[deviceId]) {
          const idx = humans.findIndex((h) => h.deviceId === deviceId);
          ensureLocalSnake(next, deviceId, getLastNickname() || "Player", Math.max(0, idx));
          camRef.current = { x: 0, y: 0 };
        }
        tickBotBrains(next);
        recordGlobalWorldTick(activeRoom, {
          humans: r.players.length,
          bots: countWorldSnakes(next) - r.players.length,
          population: countWorldSnakes(next),
        });
      }
      next.config = {
        ...next.config,
        environment: EnvironmentEngine.resolve(pc, next.tick + 1),
      };

      const localSnake = next.snakes[deviceId];
      if (localSnake) {
        localSnake.awaitingInput = awaitingInputRef.current;
      }

      if (ux.events) {
        next.events = ExperienceEngine.events.expire(next.events);
        next.expMultiplier = next.events.some((e) => e.kind === "double_exp") ? 2 : 1;
      }

      next = tickWorld(next);
      diagSimulation();
      if (isGlobalWorld) {
        respawnDeadBots(next, SNAKE_WORLD_TARGET);
        persistGlobalWorldState(activeRoom, next);
      }
      tickLivingWorld(next, pc);

      if (ux.events) {
        const evt = ExperienceEngine.events.roll(pc, next.config.worldSize, next.tick, next.events);
        if (evt) {
          next.events = [evt, ...next.events];
          spawnEventFood(next, evt);
          if (evt.kind === "boss_spawn") spawnWorldBoss(next);
        }
        const scheduled = createScheduledEvent(next, pc);
        if (scheduled) {
          next.events = [scheduled, ...next.events];
          spawnEventFood(next, scheduled);
          if (scheduled.kind === "boss_spawn") spawnWorldBoss(next);
          if (scheduled.kind === "food_storm") startFoodStorm(next);
          recordSnakeEvent(activeRoom, scheduled.kind);
          recordSnakeEventLocation(activeRoom, scheduled.x, scheduled.y, scheduled.kind);
        }
        for (const e of next.events) applyBlackHolePull(next, e);
      }

      if (before.boss && !before.boss.defeated && next.boss?.defeated) {
        const m = Replay.multiplayer.moments.capture("boss_slayer", deviceId, next.boss.label, next.tick, { boss: true });
        next.moments = [m, ...next.moments].slice(0, 5);
        recordSnakeBossKill(activeRoom);
      }

      const SURVIVAL_TICKS = Math.round(300_000 / balance.physicsTickMs);
      const deaths = Object.keys(next.snakes).length;
      const alive = Object.values(next.snakes).filter((s) => s.alive).length;
      const director = Replay.multiplayer.director.run({
        playerCount: pc,
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
        recordFoodShortageTick(activeRoom);
      }
      if (next.tick % 45 === 0) {
        const heads = Object.values(next.snakes)
          .filter((s) => s.alive && s.segments[0])
          .map((s) => s.segments[0]!);
        recordCrowdSample(activeRoom, heads, next.tick);
      }
      const feedHead = next.killFeed[0];
      const prevFeedHead = before.killFeed[0];
      if (feedHead && (!prevFeedHead || feedHead.tick !== prevFeedHead.tick)) {
        recordKillFeedEvent(activeRoom);
      }

      for (const [id, snake] of Object.entries(next.snakes)) {
        const prev = before.snakes[id];
        const lastFeed = next.killFeed[0];
        if (prev?.alive && !snake.alive) {
          const pos = getDeathPosition(prev);
          if (pos) {
            Replay.multiplayer.analytics.death(activeRoom, { deviceId: id, x: pos.x, y: pos.y, tick: next.tick, cause: "player" });
            recordSnakeDeath(activeRoom, pos.x, pos.y, "player");
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
        if (snake.boosting) recordSnakeBoost(activeRoom);
        if (snake.score > 0) Replay.multiplayer.team.score(activeRoom, id, snake.score - (prev?.score ?? 0));
      }

      const rank = getMyRank(next, deviceId);
      if (prevRankRef.current > 10 && rank <= 10) {
        const me = next.snakes[deviceId];
        const m = Replay.multiplayer.moments.capture("top10_entry", deviceId, me?.nickname ?? "Player", next.tick);
        next.moments = [m, ...next.moments].slice(0, 5);
      }

      worldRef.current = next;
      if (next.moments.length > 0) {
        sessionMomentsRef.current = [
          ...next.moments,
          ...sessionMomentsRef.current.filter((m) => !next.moments.some((n) => n.id === m.id)),
        ].slice(0, 20);
      }
      if (isHost) send(activeRoom, "state", next);
      setWorld(next);
      } catch (err) {
        diagTickError(err);
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [activeRoom, shouldTickWorld, connected, isGlobalWorld, isHost, balance.physicsTickMs, ux.events, deviceId, tickEpoch]);

  useEffect(() => {
    if (!mySnake) return;
    if (prevAliveRef.current && !mySnake.alive) {
      transitionGamePhase("DEAD", `score=${mySnake.score}`);
      markPlayerDeath(activeRoom);
      recordPlaytestExit(activeRoom, "death");
      setSpectatorTarget(getSpectatorTarget(worldRef.current, undefined, friendIds));
      spectator(activeRoom);
      recordPlaytestExit(activeRoom, "spectator");
    }
    prevAliveRef.current = mySnake.alive;
    if (world) prevRankRef.current = getMyRank(world, deviceId);
  }, [mySnake?.alive, mySnake, activeRoom, world, deviceId, friendIds]);

  const postDeath = useCallback(
    (action: "exit" | "replay" | "spectator" | "invite") => {
      if (activeRoom) tryRecordPostDeathAction(activeRoom, action);
    },
    [activeRoom]
  );

  const handleDirection = useCallback((direction: Direction) => {
    if (!activeRoom || !worldRef.current || isSpectating) return;
    if (awaitingInputRef.current) {
      awaitingInputRef.current = false;
      setAwaitingInput(false);
      setSpawnHighlightUntil(0);
      setGoFlashUntil(Date.now() + 900);
      const snake = worldRef.current.snakes[deviceId];
      if (snake) {
        snake.awaitingInput = false;
        snake.invincibleUntil = undefined;
      }
    }
    diagInput(direction);
    if (!inputLoggedRef.current) {
      inputLoggedRef.current = true;
      entryLog("INPUT", direction);
      entryLog("GAME_START", activeRoom);
      transitionGamePhase("PLAYING", `input=${direction}`);
    }
    markFirstMove(activeRoom);
    const payload = { deviceId, direction, boosting: boostingRef.current };
    if (shouldTickWorld) {
      setInput(worldRef.current, deviceId, direction);
      setBoost(worldRef.current, deviceId, boostingRef.current);
    } else {
      send(activeRoom, "input", payload);
    }
  }, [activeRoom, shouldTickWorld, deviceId, isSpectating]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const dir = DIRECTION_KEYS[e.key];
      if (dir) { e.preventDefault(); handleDirection(dir); return; }
      if (e.code === "Space" && !isSpectating && !awaitingInputRef.current) {
        e.preventDefault();
        if (!boostingRef.current) playBoostSound();
        boostingRef.current = true;
        if (shouldTickWorld && worldRef.current) setBoost(worldRef.current, deviceId, true);
        else if (activeRoom) send(activeRoom, "input", { deviceId, direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right", boosting: true });
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        boostingRef.current = false;
        if (shouldTickWorld && worldRef.current) setBoost(worldRef.current, deviceId, false);
        else if (activeRoom) send(activeRoom, "input", { deviceId, direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right", boosting: false });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleDirection, isSpectating, shouldTickWorld, deviceId, activeRoom]);

  const handleRetry = useCallback(() => {
    if (!activeRoom || !worldRef.current) return;
    postDeath("replay");
    emitGameRetry("snake");
    recordSnakeRematch(activeRoom);
    recordSpectatorRejoin(activeRoom);

    boostingRef.current = false;
    setParticles([]);
    setScorePopups([]);
    prevAliveRef.current = true;
    camRef.current = { x: 0, y: 0 };
    prevTotalKillsRef.current = 0;

    const nickname = getLastNickname() || "Player";
    const next = structuredClone(worldRef.current);
    restartPlayerSnake(next, deviceId, nickname);
    worldRef.current = next;
    setWorld(next);

    if (isHost || isGlobalWorld) send(activeRoom, "state", next);

    beginSpawnReady();

    tickEpochRef.current += 1;
    setTickEpoch(tickEpochRef.current);
  }, [activeRoom, deviceId, postDeath, isHost, isGlobalWorld, beginSpawnReady]);

  useEffect(() => {
    if (!world) return;
    const prev = prevWorldRef.current;
    if (prev && prev.tick !== world.tick) {
      prevSegmentsRef.current = Object.fromEntries(
        Object.entries(prev.snakes).map(([id, s]) => [id, s.segments.map((v) => ({ ...v }))])
      );
      prevSnakeSnapRef.current = Object.fromEntries(
        Object.entries(prev.snakes).map(([id, s]) => [id, captureSnakeSnapshot(s)])
      );
      setRenderAlpha(0);
      const me = world.snakes[deviceId];
      const prevMe = prev.snakes[deviceId];
      if (me) {
        const prevLen = prevSegCountRef.current[deviceId] ?? getSegmentCount(me);
        if (getSegmentCount(me) > prevLen) {
          growthUntilRef.current[deviceId] = Date.now() + SNAKE_FEEL.growthAnimMs;
        }
        prevSegCountRef.current[deviceId] = getSegmentCount(me);
      }
      if (prevMe && me && me.score > prevMe.score && me.segments[0]) {
        const delta = me.score - prevMe.score;
        const head = me.segments[0]!;
        const tier = tierFromKind("normal", delta);
        const vis = getFoodVisual(tier);
        if (delta >= 12) playRareFoodSound();
        else playEatSound("normal", vis.soundHz);
        markFirstFun(activeRoom);
        setParticles((p) => spawnEatParticles(p, head.x, head.y, vis.color, vis.particleCount));
        setScorePopups((pop) => spawnScorePopup(pop, head.x, head.y, delta, vis.color));
        const buf = me.gemsEaten ?? 0;
        setScorePopups((pop) =>
          spawnScorePopup(pop, head.x, head.y - 0.8, `${buf % 2}/2`, "#94a3b8")
        );
        if (me.boosting) {
          setParticles((p) => spawnBoostTrail(p, head.x, head.y, me.color));
        }
      }
      if (me && prevMe && getSegmentCount(me) > getSegmentCount(prevMe) && me.segments[0]) {
        const head = me.segments[0]!;
        setScorePopups((pop) => spawnScorePopup(pop, head.x, head.y - 1.2, "Grow!", "#22c55e"));
      }
      if (prevMe && me && getMyRank(world, deviceId) < getMyRank(prev, deviceId) && me.segments[0]) {
        playRankUpSound();
      }
      if (prevMe?.alive && !me?.alive && prevMe.segments[0]) {
        playDeathSound();
        setParticles((p) => spawnDeathBurst(p, prevMe.segments[0]!.x, prevMe.segments[0]!.y, prevMe.color));
      }
      const kills = me?.totalKills ?? 0;
      if (kills > prevTotalKillsRef.current && me?.segments[0]) {
        playKillSound(prevTotalKillsRef.current === 0);
      }
      prevTotalKillsRef.current = kills;
    }
    prevWorldRef.current = world;
  }, [world, deviceId, activeRoom]);

  const toggleFullscreen = useCallback(async () => {
    const el = viewportRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await (
          el.requestFullscreen?.() ??
          (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.()
        );
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      /* unsupported or denied */
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      diagFrame();
      const snake = worldRef.current?.snakes[deviceId];
      const boosting = !!(snake?.alive && !snake.spectating && snake.boosting);
      const targetFov = boosting ? SNAKE_FEEL.boostFovScale : 1;
      zoomMultRef.current +=
        (targetFov - zoomMultRef.current) * SNAKE_FEEL.cameraZoomLerp;

      if (snake?.alive && !snake.spectating) {
        const head = resolveSnakeHead(snake);
        const layout = camLayoutRef.current;
        if (head && layout.cellSize > 0) {
          const targetX = head.x * layout.cellSize - layout.camHalf;
          const targetY = head.y * layout.cellSize - layout.camHalf;
          const lerp = SNAKE_FEEL.cameraFollowLerp;
          camRef.current.x += (targetX - camRef.current.x) * lerp;
          camRef.current.y += (targetY - camRef.current.y) * lerp;
        }
      }
      setRenderAlpha((a) => Math.min(1, a + SNAKE_FEEL.segmentLerpStep));
      setParticles((p) => tickParticles(p));
      setScorePopups((pop) => tickScorePopups(pop));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [deviceId]);

  useEffect(() => {
    if (!activeRoom) return;
    const onLeave = () => postDeath("exit");
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [activeRoom, postDeath]);

  useEffect(() => {
    if (!isSpectating || !activeRoom) return;
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      const href = anchor?.getAttribute("href") ?? "";
      if (href.includes("/community") || href.startsWith("/p/")) {
        postDeath("invite");
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isSpectating, activeRoom, postDeath]);

  async function finishMatch() {
    if (!activeRoom || !world) return;
    transitionGamePhase("RESULT");
    const bots = Object.values(world.snakes).filter((s) => isBotSnake(s));
    if (bots.length > 0) {
      setTuringPromptBot(activeRoom, bots[Math.floor(Math.random() * bots.length)]!.nickname);
    }
    recordPlaytestExit(activeRoom, "end");
    postDeath("exit");
    const scores: Record<string, number> = {};
    for (const s of Object.values(world.snakes)) scores[s.deviceId] = s.score;
    finish(activeRoom, { roomCode: activeRoom, gameSlug: "snake", winnerId: world.rankings[0]?.deviceId ?? null, scores, finishedAt: new Date().toISOString() });
    reportScore("snake", mySnake?.score ?? 0);
    Replay.multiplayer.analytics.flush(activeRoom, world.config.worldSize);
    const telem = flushSnakeTelemetry(activeRoom);
    refreshWorldTuningFromTelemetry();
    const room = getRoom(activeRoom) ?? (practiceMode && world
      ? {
          code: activeRoom,
          gameSlug: "snake",
          hostId: deviceId,
          maxPlayers: 50 as const,
          players: [{
            deviceId,
            nickname: getLastNickname() || "Player",
            ready: true,
            score: mySnake?.score ?? 0,
          }],
          spectators: [],
          status: "finished" as const,
          countdown: 0,
          matchMode: "quick" as const,
          createdAt: new Date().toISOString(),
        }
      : null);
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
  if (!connected || !world) {
    return (
      <div ref={boardRef} className="flex w-full max-w-3xl flex-col items-center gap-3 px-2">
        <p className="text-center text-muted-foreground">Connecting… {ux.label} · {playerCount}P</p>
        <div
          className="w-full animate-pulse rounded-xl border border-white/10 bg-white/5"
          style={{ aspectRatio: "1", maxHeight: SNAKE_FEEL.maxViewportPx }}
        />
      </div>
    );
  }

  const worldSize = world.config.worldSize;
  const isBoosting = mySnake?.boosting && mySnake.alive;
  const fovMult = zoomMultRef.current;
  const rawCell =
    (boardPx / SNAKE_FEEL.viewportCellsVisible) *
    matchRule.cameraZoomMult *
    SNAKE_FEEL.baseCameraZoom *
    fovMult;
  const cellSize = Math.min(
    SNAKE_FEEL.maxCellPx,
    Math.max(SNAKE_FEEL.minCellPx, rawCell)
  );
  const myLength = mySnake ? getSegmentCount(mySnake) : 0;
  const myKills = mySnake?.totalKills ?? 0;
  const myScore = mySnake?.score ?? 0;
  const camHalf = boardPx / 2;
  camLayoutRef.current = { boardPx, cellSize, camHalf };

  const camX = camRef.current.x;
  const camY = camRef.current.y;
  const top1Id = world.rankings[0]?.deviceId ?? null;

  return (
    <div ref={boardRef} className="relative mx-auto flex w-full max-w-3xl flex-col items-center overflow-hidden px-1 sm:px-2">
      <div
        ref={viewportRef}
        className="relative flex w-full justify-center overflow-hidden [&:fullscreen]:flex [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:items-center [&:fullscreen]:justify-center [&:fullscreen]:bg-black"
      >
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="absolute right-2 top-2 z-40 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/80"
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
        >
          {isFullscreen ? "⛶ Exit" : "⛶ Full Screen"}
        </button>

        {/* MVP HUD — Length / Kills / Boost */}
        <div className="pointer-events-none absolute left-2 top-2 z-30 rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs backdrop-blur-sm">
          <p className="font-bold text-white">Length <span className="text-emerald-300">{myLength}</span></p>
          <p className="mt-0.5 text-muted-foreground">Kills <span className="text-amber-300">{myKills}</span></p>
          <p className={cn("mt-0.5", isBoosting ? "font-semibold text-amber-300" : "text-white/40")}>
            {isBoosting ? "⚡ BOOST" : "Boost"}
          </p>
        </div>

        {/* MVP HUD — Top10 */}
        <div className="pointer-events-none absolute right-2 top-12 z-30 w-36 rounded-lg border border-white/10 bg-black/55 px-2 py-2 text-[10px] backdrop-blur-sm">
          <p className="mb-1 font-semibold text-amber-300">TOP 10</p>
          <ol className="space-y-0.5">
            {top10.slice(0, 10).map((r, i) => (
              <li
                key={r.deviceId}
                className={cn(
                  "truncate",
                  r.deviceId === deviceId ? "font-bold text-emerald-300" : "text-white/75"
                )}
              >
                {i + 1}. {r.nickname.length > 8 ? r.nickname.slice(0, 7) + "…" : r.nickname}{" "}
                <span className="text-white/50">L{world.snakes[r.deviceId] ? getSegmentCount(world.snakes[r.deviceId]!) : "?"}</span>
              </li>
            ))}
          </ol>
        </div>
        <div
          className="relative w-full overflow-hidden rounded-xl border border-white/10 touch-none transition-transform duration-200 ease-out"
          style={{
            width: boardPx,
            height: boardPx,
            maxWidth: "100%",
            backgroundColor: seasonStyle.bg,
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px), radial-gradient(circle at 30% 20%, rgba(120,80,255,0.08), transparent 40%), radial-gradient(circle at 70% 80%, rgba(34,211,238,0.06), transparent 35%)",
            backgroundSize: `${cellSize}px ${cellSize}px`,
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
          <div
            className="absolute origin-top-left transition-transform duration-200 ease-out"
            style={{
              width: worldSize * cellSize,
              height: worldSize * cellSize,
              transform: `translate(${-camX}px, ${-camY}px)`,
            }}
          >
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
            {world.food.map((f, i) => {
              const tier = f.tier ?? tierFromKind(f.kind, f.value);
              const vis = getFoodVisual(tier);
              const size = Math.max(vis.sizePx, cellSize * (vis.sizePx / 18));
              const offset = (cellSize - size) / 2;
              const myHead = resolveSnakeHead(mySnake ?? undefined);
              const magnetR = isBoosting ? SNAKE_FEEL.magnetRadiusBoost : SNAKE_FEEL.magnetRadius;
              const fd = myHead ? Math.hypot(f.x - myHead.x, f.y - myHead.y) : 999;
              const magneted = fd < magnetR && fd > 0.05;
              const magnetScale = magneted ? 1 + (1 - fd / magnetR) * 0.4 : 1;
              const magnetOpacity = magneted ? 0.85 + (1 - fd / magnetR) * 0.15 : 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "absolute rounded-full transition-transform duration-75",
                    tier === "epic" && "animate-pulse",
                    tier === "death" && "animate-pulse ring-2 ring-red-400/50",
                    tier !== "small" && "ring-1 ring-white/30",
                    magneted && "z-10"
                  )}
                  style={{
                    left: f.x * cellSize + offset - (size * (magnetScale - 1)) / 2,
                    top: f.y * cellSize + offset - (size * (magnetScale - 1)) / 2,
                    width: size * magnetScale,
                    height: size * magnetScale,
                    backgroundColor: vis.color,
                    boxShadow: magneted ? `${vis.glow}, 0 0 12px ${vis.color}` : vis.glow,
                    opacity: magnetOpacity,
                  }}
                />
              );
            })}
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
              const snap = prevSnakeSnapRef.current[snake.deviceId];
              const segs = snap
                ? interpolateSnakeRender(snake, snap, renderAlpha)
                : lerpSegments(
                    prevSegmentsRef.current[snake.deviceId],
                    snake.segments,
                    renderAlpha,
                    Math.min(1, renderAlpha * (SNAKE_FEEL.headLerpStep / SNAKE_FEEL.segmentLerpStep)),
                    snake.boosting ? SNAKE_FEEL.tailWaveAmpBoost : SNAKE_FEEL.tailWaveAmp
                  );
              const growing = (growthUntilRef.current[snake.deviceId] ?? 0) > Date.now();
              const growthLeft = (growthUntilRef.current[snake.deviceId] ?? 0) - Date.now();
              const popScale = growing
                ? 0.9 + Math.sin((1 - Math.max(0, growthLeft) / SNAKE_FEEL.growthAnimMs) * Math.PI) * 0.2
                : 1;
              const len = segs.length;
              const headRad = ((snake.angle ?? 0) * 180) / Math.PI;
              const isMe = snake.deviceId === deviceId;
              const highlight = isMe && spawnHighlightUntil > Date.now();
              return segs.map((seg, i) => {
                const isHead = i === 0;
                const isTail = i === len - 1;
              const segBase = cellSize * 0.72;
                const segSize = isHead
                  ? segBase * SNAKE_MVP_RC1.headScale
                  : isTail
                    ? segBase * SNAKE_MVP_RC1.tailScale
                    : segBase * SNAKE_MVP_RC1.bodyScale;
                const growthScale = growing && i >= len - 2 ? popScale : 1;
                const size = segSize * growthScale;
                const pulse = highlight ? 1 + Math.sin(Date.now() / 120) * 0.12 : 1;
                return (
                  <div
                    key={`${snake.deviceId}-${i}`}
                    className={cn(
                      "absolute rounded-full origin-center",
                      (!snake.alive || snake.spectating) && "opacity-25",
                      isHead && "z-10",
                      isMe && snake.alive && "ring-2 ring-white/90",
                      snake.boosting && isHead && "ring-2 ring-amber-300/60"
                    )}
                    style={{
                      left: seg.x * cellSize + (cellSize - size * pulse) / 2,
                      top: seg.y * cellSize + (cellSize - size * pulse) / 2,
                      width: size * pulse,
                      height: size * pulse,
                      backgroundColor: snake.color,
                      opacity: isTail ? 0.75 : isHead ? 1 : 0.92,
                      boxShadow: highlight
                        ? "0 0 18px rgba(255,255,255,0.95), 0 0 28px rgba(255,255,255,0.45)"
                        : isHead
                          ? snake.invincibleUntil && Date.now() < snake.invincibleUntil
                            ? "0 0 10px white"
                            : snake.boosting
                              ? `0 0 14px ${snake.color}, 0 0 20px #fbbf2488`
                              : `0 0 8px ${snake.color}`
                          : undefined,
                      transform: isHead ? `rotate(${headRad}deg)` : undefined,
                    }}
                  />
                );
              });
            })}
            {Object.values(world.snakes).map((snake) => {
              if (!snake.alive || !snake.segments[0]) return null;
              const head = resolveSnakeHead(snake);
              if (!head) return null;
              const isMe = snake.deviceId === deviceId;
              const myHead = resolveSnakeHead(worldRef.current?.snakes[deviceId] ?? mySnake);
              const dist = myHead ? Math.hypot(head.x - myHead.x, head.y - myHead.y) : 999;
              if (!isMe && dist > 14) return null;
              const label = isMe ? "YOU" : snake.nickname.slice(0, 8);
              return (
                <div
                  key={`label-${snake.deviceId}`}
                  className="pointer-events-none absolute z-20 whitespace-nowrap text-[9px] font-bold"
                  style={{
                    left: head.x * cellSize,
                    top: head.y * cellSize - cellSize * 1.1,
                    color: isMe ? "#fde047" : "rgba(255,255,255,0.75)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                  }}
                >
                  {label}
                </div>
              );
            })}
            {scorePopups.map((pop) => (
              <div
                key={pop.id}
                className="absolute z-30 pointer-events-none font-bold text-sm"
                style={{
                  left: pop.x * cellSize,
                  top: pop.y * cellSize - (1 - pop.life) * cellSize * 2,
                  color: pop.color,
                  opacity: pop.life,
                  textShadow: `0 0 8px ${pop.color}`,
                }}
              >
                {pop.text}
              </div>
            ))}
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

        {awaitingInput && mySnake?.alive ? (
          <div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-2">
            <p className="rounded-lg border border-yellow-300/40 bg-black/70 px-3 py-1 text-xs font-bold tracking-widest text-yellow-300 backdrop-blur-sm">
              YOU
            </p>
            <p className="animate-pulse rounded-lg border border-white/20 bg-black/70 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              방향키를 누르면 시작
            </p>
          </div>
        ) : null}

        {goFlashUntil > Date.now() ? (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <p className="animate-in zoom-in-95 text-5xl font-black tracking-wider text-emerald-300 drop-shadow-[0_0_24px_rgba(52,211,153,0.8)]">
              GO!
            </p>
          </div>
        ) : null}

        {ux.minimap ? (
          <div className="pointer-events-none absolute bottom-14 right-2 z-30">
            <SnakeMinimap
            snakes={Object.values(world.snakes)}
            worldSize={worldSize}
            deviceId={deviceId}
            top1Id={top1Id}
            camX={camX}
            camY={camY}
            viewPx={boardPx}
            cellSize={cellSize}
          />
          </div>
        ) : null}

        {/* MVP HUD — bottom global rank bar */}
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-30 flex justify-center">
          <div className="rounded-lg border border-white/10 bg-black/55 px-4 py-1.5 text-center text-[11px] backdrop-blur-sm">
            <p className="font-semibold tracking-wide text-amber-300">GLOBAL RANK #{myRank}</p>
            <p className="mt-0.5 text-white/70">오늘 순위 #{myRank}</p>
            <p className="mt-0.5 text-white/85">
              Length <span className="font-bold text-emerald-300">{myLength}</span>
              {" · "}
              Kills <span className="font-bold text-amber-300">{myKills}</span>
            </p>
          </div>
        </div>
      </div>

      {mySnake && !mySnake.alive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-black/85 px-6 py-8 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <p className="text-2xl font-bold tracking-wide text-red-400">GAME OVER</p>
            <p className="mt-2 text-sm text-muted-foreground">Retry 버튼을 눌러 새 게임을 시작하세요</p>
            <div className="mt-6 flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={handleRetry}>
                Retry
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setSpectatorTarget(getSpectatorTarget(worldRef.current, undefined, friendIds))}
              >
                Spectate
              </Button>
              <Button variant="outline" size="lg" className="w-full" nativeButton={false} render={<Link href="/">Home</Link>} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { postDeath("exit"); handleEnd(); }}
              >
                Result
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!isSpectating && mySnake?.alive && !awaitingInput ? (
        <SnakeMobileControls
          onDirection={handleDirection}
          onBoostStart={() => {
            if (getSegmentCount(mySnake) <= SNAKE_FEEL.boostMinSegments) return;
            if (!boostingRef.current) playBoostSound();
            boostingRef.current = true;
            if (shouldTickWorld && worldRef.current) setBoost(worldRef.current, deviceId, true);
            else if (activeRoom) {
              send(activeRoom, "input", {
                deviceId,
                direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right",
                boosting: true,
              });
            }
          }}
          onBoostEnd={() => {
            boostingRef.current = false;
            if (shouldTickWorld && worldRef.current) setBoost(worldRef.current, deviceId, false);
            else if (activeRoom) send(activeRoom, "input", {
              deviceId,
              direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right",
              boosting: false,
            });
          }}
          boosting={!!isBoosting}
          boostReady={getSegmentCount(mySnake) > SNAKE_FEEL.boostMinSegments}
        />
      ) : null}
    </div>
  );
}
