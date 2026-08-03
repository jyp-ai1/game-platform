"use client";

import { getDeviceId, getLastNickname, useGameSDK, emitGameExit, emitGameRetry } from "@game-platform/game-sdk";
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
  joinRoom,
  joinRoomAsync,
  leaveRoom,
  replay,
  resolveAvailableCluster,
  send,
  spectator,
  start,
  subscribeRoom,
} from "@game-platform/multiplayer-sdk";
import { completeMultiplayerMatch, getFriends } from "@game-platform/replay-engine/social";
import { cn, GameOverOverlay, Button } from "@game-platform/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

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
  buildStageMatchRule,
  getSnakeStage,
  SNAKE_STAGE_COUNT,
  stagePopulation,
} from "./snake-stage-config";
import {
  loadSnakeStageSave,
  persistSnakeStageSave,
} from "./snake-stage-save";
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
import { initFixDeath001, noteFixDeath001Sample } from "./snake-fix-death-001";
import { initFixDeath001Step2, setFixDeath001Step2Focus } from "./snake-fix-death-001-step2";
import { deathTrace, initDeathTrace } from "./snake-death-trace";
import { initDeath003Trace } from "./snake-death-003-trace";
import { initDeath004Trace } from "./snake-death-004-trace";
import { PlaytestHeatmap } from "./snake-playtest-heatmap";
import { PlaytestLog } from "./snake-playtest-log";
import { PlaytestObservation } from "./snake-playtest-observation";
import { PlaytestReport } from "./snake-playtest-report";
import { refreshWorldTuningFromTelemetry } from "./snake-balance-tuner";
import { recordSnakeSessionEnd } from "./snake-session-recap";
import { SNAKE_FEEL } from "./snake-feel-tuning";
import { SNAKE_MVP_RC1, resolveSnakeHead } from "./snake-mvp-rc1";
import { applyCharacterToSnake, resolveHeadEmoji, segmentBodyColor, type SnakeHeadId } from "./snake-characters";
import {
  enterViewportFullscreen,
  exitViewportFullscreen,
  isViewportFullscreen,
  measureGameBoardPx,
} from "./snake-fullscreen";
import { getFoodVisual, tierFromKind } from "./snake-food-types";
import { SnakeMinimap } from "./snake-minimap";
import { SnakeWorldHud } from "./snake-world-hud";
import { SnakeMobileControls } from "./snake-mobile-controls";
import { SnakeRankingPanel } from "./snake-ranking-panel";
import {
  playBoostSound,
  playBoostEndSound,
  playDeathSound,
  playEatSound,
  playKillSound,
  playRareFoodSound,
  playRankUpSound,
  spawnBoostTrail,
  spawnDeathBurst,
  spawnEatParticles,
  spawnScorePopup,
  shakeIntensity,
  tickParticles,
  tickScorePopups,
  type Particle,
  type ScorePopup,
} from "./snake-feel";

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

type PlayerInputPayload = { deviceId: string; direction: Direction; boosting?: boolean };

function sendPlayerInput(roomCode: string, globalWorld: boolean, payload: PlayerInputPayload): void {
  send(roomCode, globalWorld ? `input:${payload.deviceId}` : "input", payload);
}

/** Flagship Snake.io — Events · Teams · Objectives · Spectator 2.0 */
export function SnakeIoGame({
  practiceMode = false,
  onJoinTimeout,
  headCharacter = "frog",
}: {
  practiceMode?: boolean;
  onJoinTimeout?: () => void;
  headCharacter?: SnakeHeadId;
} = {}) {
  const params = useSearchParams();
  const roomCode = practiceMode ? "PRACTICE" : (params.get("room")?.toUpperCase() ?? "");
  const isStageMode = roomCode === "STAGE" || params.get("mode") === "stage";
  const isLocalOnly = practiceMode || isStageMode;
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
  const shakeRef = useRef(0);
  const zoomMultRef = useRef(1);
  const boardRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(480);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
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
  const [respawnSec, setRespawnSec] = useState<number | null>(null);
  const [worldHudFps, setWorldHudFps] = useState(60);
  const [worldHudPing, setWorldHudPing] = useState<number | null>(null);
  const lastStateAtRef = useRef(Date.now());
  const fpsSampleRef = useRef({ frames: 0, at: performance.now() });
  const headCharacterRef = useRef<SnakeHeadId>(headCharacter);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderAlpha, setRenderAlpha] = useState(1);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const prevSegCountRef = useRef<Record<string, number>>({});
  const growthUntilRef = useRef<Record<string, number>>({});
  const eatPopUntilRef = useRef<Record<string, number>>({});
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
  const localSpawnBoundRef = useRef(false);
  const connectDoneRef = useRef(false);
  const tickEpochRef = useRef(0);
  const [tickEpoch, setTickEpoch] = useState(0);
  /** Stage mode — current stage index (0-based), cumulative run score, overlay gate. */
  const [stageIndex, setStageIndex] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [stageOverlay, setStageOverlay] = useState<"none" | "stage-clear" | "game-over" | "run-complete">("none");
  const stageStartScoreRef = useRef(0);
  const runScoreRef = useRef(0);
  const stageOverlayRef = useRef<"none" | "stage-clear" | "game-over" | "run-complete">("none");
  stageOverlayRef.current = stageOverlay;
  const playerCountRef = useRef(1);
  const prevWorldTickRef = useRef({ tick: 0, at: 0 });
  const camLayoutRef = useRef({ boardPx: 480, cellSize: 10, camHalf: 240 });
  const worldLayerRef = useRef<HTMLDivElement>(null);
  const renderAlphaRef = useRef(1);
  const frameCounterRef = useRef(0);
  const [, bumpLocalInput] = useReducer((n: number) => n + 1, 0);
  onJoinTimeoutRef.current = onJoinTimeout;

  const effectiveRoomCode = sessionRoom || roomCode;
  const activeRoom = effectiveRoomCode;
  const room = getRoom(activeRoom);
  const isGlobalWorld = isGlobalWorldRoom(effectiveRoomCode, "snake");
  /** RC-HUD-001: WORLD fills viewport; multiplayer chrome stays visible (immersive hide off). */
  const worldLayout = isGlobalWorld && !isStageMode;
  const immersivePlay = false;
  const isGameFullscreen = isFullscreen || pseudoFullscreen || worldLayout;
  const humanCount = room?.players.length ?? 1;
  const worldPopulation = world ? countWorldSnakes(world) : (isGlobalWorld ? SNAKE_WORLD_TARGET : humanCount);
  const playerCount = worldPopulation;
  playerCountRef.current = playerCount;
  const balance = useMemo(() => Replay.multiplayer.balance("snake", playerCount), [playerCount]);
  const ux = useMemo(() => Replay.multiplayer.ux(playerCount), [playerCount]);
  const showMinimap = !immersivePlay && (isGlobalWorld || ux.minimap);
  const worldHudPlayers = room?.players.length ?? 0;
  const worldHudBots = world
    ? Math.max(0, countWorldSnakes(world) - worldHudPlayers)
    : Math.max(0, SNAKE_WORLD_TARGET - worldHudPlayers);
  const worldTickHz = Math.round(1000 / balance.physicsTickMs);
  const season = useMemo(() => Replay.multiplayer.season.current(), []);
  const seasonStyle = Replay.multiplayer.season.palette[season];
  const progressionStage = useMemo(
    () => Replay.multiplayer.progression.stageFor(Replay.multiplayer.progression.snake, world?.snakes[deviceId]?.score ?? 0),
    [world?.snakes[deviceId]?.score, deviceId]
  );
  void progressionStage;
  const isHost = isLocalOnly || room?.hostId === deviceId;
  // RC-SYNC-001: WORLD clients simulate locally; applyRoom merges host world around local snake.
  const shouldTickWorld = isLocalOnly || isHost || isGlobalWorld;
  const mySnake = world?.snakes[deviceId];
  const isSpectating = !isStageMode && mySnake?.spectating && !mySnake?.alive;
  const stageConfig = isStageMode ? getSnakeStage(stageIndex) : null;
  const matchRule = useMemo(
    () => (stageConfig ? buildStageMatchRule(stageConfig) : resolveSnakeMatchRule(playerCount)),
    [stageConfig, playerCount]
  );
  const friendIds = useMemo(() => getFriends().map((f) => f.deviceId), []);
  const watchId = spectatorMode === "boss" && world?.boss && !world.boss.defeated
    ? null
    : spectatorTarget ?? (world ? getSpectatorTarget(world, spectatorMode === "friend" ? undefined : deviceId, friendIds) : null);
  const watchSnake = watchId && world ? world.snakes[watchId] : null;
  const bossCam = spectatorMode === "boss" && world?.boss && !world.boss.defeated ? world.boss : null;
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
    setGoFlashUntil(0);
    const snake = worldRef.current?.snakes[deviceId];
    if (snake) {
      snake.awaitingInput = true;
      snake.spectating = false;
    }
    const snapCamera = () => {
      const s = worldRef.current?.snakes[deviceId];
      const head = resolveSnakeHead(s ?? undefined);
      const layout = camLayoutRef.current;
      if (head && layout.cellSize > 0) {
        camRef.current = {
          x: head.x * layout.cellSize - layout.camHalf,
          y: head.y * layout.cellSize - layout.camHalf,
        };
      }
    };
    snapCamera();
    requestAnimationFrame(snapCamera);
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
    if (!isGlobalWorld || !mySnake || mySnake.alive) {
      setRespawnSec(null);
      return;
    }
    const tick = () => {
      if (!mySnake.respawnAt) {
        setRespawnSec(null);
        return;
      }
      const left = mySnake.respawnAt - Date.now();
      setRespawnSec(left > 0 ? Math.ceil(left / 1000) : null);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [isGlobalWorld, mySnake?.alive, mySnake?.respawnAt, world?.tick]);

  useEffect(() => {
    if (!isGlobalWorld) return;
    const updatedAt = room?.gameState?._updatedAt as string | undefined;
    if (updatedAt) {
      setWorldHudPing(Math.max(0, Math.round(Date.now() - new Date(updatedAt).getTime())));
    }
  }, [isGlobalWorld, world?.tick, room?.gameState]);

  useEffect(() => {
    if (!isGlobalWorld) return;
    const id = window.setInterval(() => {
      const sample = fpsSampleRef.current;
      const now = performance.now();
      const dt = (now - sample.at) / 1000;
      if (dt > 0) {
        setWorldHudFps(Math.max(1, Math.round((frameCounterRef.current - sample.frames) / dt)));
      }
      sample.frames = frameCounterRef.current;
      sample.at = now;
    }, 1000);
    return () => window.clearInterval(id);
  }, [isGlobalWorld]);

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
    headCharacterRef.current = headCharacter;
    const s = worldRef.current?.snakes[deviceId];
    if (s && !isBotSnake(s)) applyCharacterToSnake(s, headCharacter);
  }, [headCharacter, deviceId]);

  const applyLocalHead = useCallback((w: SnakeIoWorld) => {
    const s = w.snakes[deviceId];
    if (s && !isBotSnake(s)) applyCharacterToSnake(s, headCharacterRef.current);
  }, [deviceId]);

  const initStageWorld = useCallback(
    (stageIdx: number): SnakeIoWorld => {
      const stage = getSnakeStage(stageIdx);
      const pop = stagePopulation(stage);
      const cfg = Replay.multiplayer.balance("snake", pop);
      const humans = [{ deviceId, nickname: getLastNickname() || "Player" }];
      const initial = createInitialWorld(humans, cfg);
      syncSnakePopulation(initial, humans, pop, deviceId);
      const rule = buildStageMatchRule(stage);
      initLivingWorld(initial, rule);
      if (initial.living) initial.living.stageSpeedMult = stage.speedMult;
      applyMatchIdentity(initial);
      initial.objective = {
        kind: "score_race",
        target: stage.scoreTarget,
        progress: {},
        label: stage.label,
      };
      applyLocalHead(initial);
      return initial;
    },
    [deviceId, applyLocalHead]
  );

  const currentStageScore = useCallback((): number => {
    const me = worldRef.current?.snakes[deviceId];
    if (!me) return runScoreRef.current;
    return runScoreRef.current + Math.max(0, me.score - stageStartScoreRef.current);
  }, [deviceId]);

  const handleNextStage = useCallback(() => {
    const me = worldRef.current?.snakes[deviceId];
    const earned = me ? Math.max(0, me.score - stageStartScoreRef.current) : 0;
    const nextRun = runScoreRef.current + earned;
    runScoreRef.current = nextRun;
    setRunScore(nextRun);

    const nextIdx = stageIndex + 1;
    if (nextIdx >= SNAKE_STAGE_COUNT) {
      setStageOverlay("run-complete");
      return;
    }

    setStageIndex(nextIdx);
    setStageOverlay("none");
    stageStartScoreRef.current = 0;

    persistSnakeStageSave({
      stageIndex: nextIdx,
      runScore: nextRun,
      bestRunScore: loadSnakeStageSave()?.bestRunScore ?? 0,
    });

    const initial = initStageWorld(nextIdx);
    worldRef.current = initial;
    setWorld(initial);
    prevAliveRef.current = true;
    boostingRef.current = false;
    tickEpochRef.current += 1;
    setTickEpoch(tickEpochRef.current);
    beginSpawnReady();
  }, [stageIndex, initStageWorld, beginSpawnReady]);

  const handleStageRetry = useCallback(() => {
    emitGameRetry("snake");
    setStageOverlay("none");
    prevAliveRef.current = true;
    boostingRef.current = false;
    stageStartScoreRef.current = 0;

    const initial = initStageWorld(stageIndex);
    worldRef.current = initial;
    setWorld(initial);
    tickEpochRef.current += 1;
    setTickEpoch(tickEpochRef.current);
    beginSpawnReady();
  }, [initStageWorld, beginSpawnReady, stageIndex]);

  useEffect(() => {
    const measure = () => {
      const nativeFs = isViewportFullscreen(viewportRef.current);
      const fs = nativeFs || pseudoFullscreen || worldLayout;
      setBoardPx(
        measureGameBoardPx({
          fullscreen: fs,
          containerWidth: boardRef.current?.clientWidth ?? window.innerWidth,
        })
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (boardRef.current) ro.observe(boardRef.current);
    window.visualViewport?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.visualViewport?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [connected, world, pseudoFullscreen, isFullscreen, worldLayout]);

  useEffect(() => {
    if (!worldLayout || !connected || !world) return;
    setPseudoFullscreen(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [worldLayout, connected, world]);

  useEffect(() => {
    if (practiceMode || roomCode) return;
    entryLogFail("JOIN", "missing room param");
    entryLog("PRACTICE_FALLBACK", "empty-room");
    onJoinTimeoutRef.current?.();
  }, [roomCode, practiceMode]);

  useEffect(() => {
    if (!roomCode) return;
    if (connectDoneRef.current) return;
    if (isStageMode) {
      connectDoneRef.current = true;
      entryLog("CONNECTING", "STAGE");
      const saved = loadSnakeStageSave();
      const startIdx = saved?.stageIndex ?? 0;
      const initial = initStageWorld(startIdx);
      worldRef.current = initial;
      setWorld(initial);
      setConnected(true);
      setStageIndex(startIdx);
      const savedRun = saved?.runScore ?? 0;
      setRunScore(savedRun);
      runScoreRef.current = savedRun;
      stageStartScoreRef.current = 0;
      setStageOverlay("none");
      persistSnakeStageSave({
        stageIndex: startIdx,
        runScore: savedRun,
        bestRunScore: saved?.bestRunScore ?? 0,
      });
      entryLog("CONNECTED", "STAGE");
      entryLog("SPAWNED");
      entryLog("GAME_READY", `STAGE-${startIdx + 1}`);
      return;
    }
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
  }, [roomCode, practiceMode, isStageMode, deviceId, initStageWorld]);

  useEffect(() => {
    if (!effectiveRoomCode || !connected || isLocalOnly) return;

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
      if (me && !me.alive) {
        restartPlayerSnake(w, deviceId, getLastNickname() || "Player");
        me = w.snakes[deviceId];
        spawnTrace("PLAYER_REVIVE dead→retry spawn");
      }
      if (!me) {
        const idx = humans.findIndex((h) => h.deviceId === deviceId);
        me = ensureLocalSnake(w, deviceId, getLastNickname() || "Player", Math.max(0, idx));
        spawnTrace("PLAYER_CREATE retry ensureLocalSnake");
        recordSpawnAudit(`ensureLocalSnake len=${getSegmentCount(me)}`, true);
      }
      if (me) {
        applyLocalHead(w);
        spawnTrace("PLAYER_CREATE");
        spawnTrace(`SPAWN_SUCCESS len=${getSegmentCount(me)}`);
        recordSpawnAudit(`PLAYER_CREATE len=${getSegmentCount(me)}`, true);
      } else {
        spawnTrace("PLAYER_CREATE FAIL — missing after syncSnakePopulation");
        recordSpawnAudit("missing after syncSnakePopulation", false);
      }
      return w;
    };

    /**
     * RC-SYNC-001 A':
     * host state = authoritative for bots / other players / food / killFeed / events
     * local snake = engine worldRef override (position, direction, input, awaiting, segments)
     * host missing local → attachLocalPlayer only (never clone-wipe then re-attach mid-move)
     */
    const mergeGlobalWorldState = (raw: SnakeIoWorld, r: GameRoom): SnakeIoWorld => {
      const next = structuredClone(raw);
      const local = worldRef.current?.snakes[deviceId];
      const hostMe = next.snakes[deviceId];

      if (local) {
        // RC-DEATH-002 observe only: host vs local alive mismatch (possible death wipe)
        if (hostMe && hostMe.alive !== local.alive) {
          deathTrace("merge_alive_conflict", {
            tick: next.tick,
            victimId: deviceId,
            victimBot: false,
            detail: {
              hostAlive: hostMe.alive,
              localAlive: local.alive,
              hostSpectating: !!hostMe.spectating,
              localSpectating: !!local.spectating,
              adopted: "local",
            },
          });
        }
        next.snakes[deviceId] = structuredClone(local);
        localSpawnBoundRef.current = true;
        return next;
      }

      localSpawnBoundRef.current = true;
      return attachLocalPlayer(next, r);
    };

    const applyRoom = (r: GameRoom) => {
      const state = r.gameState?.state as SnakeIoWorld | undefined;
      if (state) {
        if (isGlobalWorld) {
          // Host tick owns worldRef — ignore subscribeRoom state echoes.
          if (isHost) {
            if (!worldRef.current) {
              const next = attachLocalPlayer(structuredClone(state), r);
              worldRef.current = next;
              setWorld(next);
              localSpawnBoundRef.current = true;
            }
            return;
          }
          // RC-SYNC-001 A': merge host world + local snake override → one render snapshot
          const next = mergeGlobalWorldState(state, r);
          worldRef.current = next;
          setWorld(next);
          return;
        }
        worldRef.current = state;
        setWorld(state);
        return;
      }
      if (!worldRef.current && isHost) {
        spawnTrace("SPAWN_REQUEST");
        const cfg = Replay.multiplayer.balance("snake", isGlobalWorld ? SNAKE_WORLD_TARGET : Math.max(1, r.players.length));
        const obj = Replay.multiplayer.objectives.create(Replay.multiplayer.objectives.pick(isGlobalWorld ? SNAKE_WORLD_TARGET : Math.max(1, r.players.length)));
        const humans = humansForRoom(r);
        const persisted = isGlobalWorld ? loadPersistedGlobalWorld(effectiveRoomCode) : null;
        let initial = persisted ?? createInitialWorld(humans, cfg);
        initial = attachLocalPlayer(initial, r);
        localSpawnBoundRef.current = true;
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
  }, [effectiveRoomCode, connected, isHost, isGlobalWorld, isLocalOnly, deviceId]);

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
    initDeathTrace();
    initDeath003Trace();
    initDeath004Trace();
    initFixDeath001();
    initFixDeath001Step2(deviceId);
    setFixDeath001Step2Focus(deviceId);
    return () => shutdownLoopDiag();
  }, [deviceId]);

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
      if (stageOverlayRef.current !== "none") return;
      if (isPausedRef.current) return;
      if (epoch !== tickEpochRef.current) return;
      diagTick();
      const pc = playerCountRef.current;
      const r = getRoom(activeRoom);
      const gs = r?.gameState as Record<string, unknown> | undefined;
      if (gs && worldRef.current) {
        for (const [key, val] of Object.entries(gs)) {
          if (!key.startsWith("input:") || !val || typeof val !== "object") continue;
          const input = val as { deviceId: string; direction: Direction; boosting?: boolean };
          if (!worldRef.current.snakes[input.deviceId]) continue;
          if (isBotSnake(worldRef.current.snakes[input.deviceId]!)) continue;
          setInput(worldRef.current, input.deviceId, input.direction);
          setBoost(worldRef.current, input.deviceId, !!input.boosting);
        }
      }
      // Legacy single-input key (private rooms)
      const input = gs?.input as PlayerInputPayload | undefined;
      if (input && worldRef.current) {
        const snake = worldRef.current.snakes[input.deviceId];
        if (snake && !isBotSnake(snake)) {
          setInput(worldRef.current, input.deviceId, input.direction);
          setBoost(worldRef.current, input.deviceId, !!input.boosting);
        }
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
          applyLocalHead(next);
          camRef.current = { x: 0, y: 0 };
        }
        tickBotBrains(next);
        recordGlobalWorldTick(activeRoom, {
          humans: r.players.length,
          bots: countWorldSnakes(next) - r.players.length,
          population: countWorldSnakes(next),
        });
      }
      if (isStageMode && stageConfig && stageConfig.aiCount > 0) {
        tickBotBrains(next);
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
      if (isGlobalWorld && isHost) {
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
      if (isStageMode) {
        transitionGamePhase("DEAD", `score=${mySnake.score}`);
        markPlayerDeath(activeRoom);
        setStageOverlay("game-over");
        prevAliveRef.current = mySnake.alive;
        return;
      }
      transitionGamePhase("DEAD", `score=${mySnake.score}`);
      markPlayerDeath(activeRoom);
      recordPlaytestExit(activeRoom, "death");
      setSpectatorTarget(getSpectatorTarget(worldRef.current, undefined, friendIds));
      spectator(activeRoom);
      recordPlaytestExit(activeRoom, "spectator");
    }
    prevAliveRef.current = mySnake.alive;
    if (world) prevRankRef.current = getMyRank(world, deviceId);
  }, [mySnake?.alive, mySnake, activeRoom, world, deviceId, friendIds, isStageMode]);

  useEffect(() => {
    if (!isStageMode || !mySnake?.alive || stageOverlay !== "none") return;
    const stage = getSnakeStage(stageIndex);
    const earned = mySnake.score - stageStartScoreRef.current;
    if (earned >= stage.scoreTarget) {
      setStageOverlay("stage-clear");
    }
  }, [isStageMode, mySnake?.score, mySnake?.alive, stageIndex, stageOverlay]);

  const prevStageOverlayRef = useRef(stageOverlay);
  useEffect(() => {
    if (stageOverlay === "stage-clear" && prevStageOverlayRef.current !== "stage-clear") {
      playRankUpSound();
    }
    prevStageOverlayRef.current = stageOverlay;
  }, [stageOverlay]);

  const postDeath = useCallback(
    (action: "exit" | "replay" | "spectator" | "invite") => {
      if (activeRoom) tryRecordPostDeathAction(activeRoom, action);
    },
    [activeRoom]
  );

  const handleStageExit = useCallback(() => {
    const finalScore = currentStageScore();
    persistSnakeStageSave({
      stageIndex,
      runScore: runScoreRef.current,
      bestRunScore: Math.max(finalScore, loadSnakeStageSave()?.bestRunScore ?? 0),
    });
    reportScore("snake", finalScore);
    emitGameExit("snake");
    postDeath("exit");
  }, [currentStageScore, reportScore, postDeath, stageIndex]);

  useEffect(() => {
    if (!isStageMode || stageOverlay !== "none") return;
    persistSnakeStageSave({
      stageIndex,
      runScore: runScoreRef.current,
      bestRunScore: loadSnakeStageSave()?.bestRunScore ?? 0,
    });
  }, [isStageMode, stageIndex, runScore, stageOverlay, world?.tick]);

  const handleQuitGame = useCallback(() => {
    setIsPaused(false);
    emitGameExit("snake");
    postDeath("exit");
    if (activeRoom && !isLocalOnly) {
      try {
        leaveRoom(activeRoom);
      } catch {
        /* room may already be gone */
      }
    }
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }, [postDeath, activeRoom, isLocalOnly]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const handleDirection = useCallback((direction: Direction) => {
    if (isPausedRef.current) return;
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
    if (shouldTickWorld && worldRef.current) {
      setInput(worldRef.current, deviceId, direction);
      setBoost(worldRef.current, deviceId, boostingRef.current);
    } else if (activeRoom) {
      if (!isGlobalWorld && worldRef.current) {
        setInput(worldRef.current, deviceId, direction);
        setBoost(worldRef.current, deviceId, boostingRef.current);
      }
      bumpLocalInput();
      sendPlayerInput(activeRoom, isGlobalWorld, payload);
    }
  }, [activeRoom, shouldTickWorld, deviceId, isSpectating, isGlobalWorld]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSpectating && !awaitingInputRef.current) {
        e.preventDefault();
        setIsPaused((p) => !p);
        return;
      }
      if (isPausedRef.current) return;
      const dir = DIRECTION_KEYS[e.key];
      if (dir) { e.preventDefault(); handleDirection(dir); return; }
      if (e.code === "Space" && !isSpectating && !awaitingInputRef.current) {
        e.preventDefault();
        if (!boostingRef.current) playBoostSound();
        if (isGlobalWorld) shakeRef.current = Math.max(shakeRef.current, 4);
        boostingRef.current = true;
        if (worldRef.current && shouldTickWorld) {
          setBoost(worldRef.current, deviceId, true);
        } else if (worldRef.current && !isGlobalWorld) {
          setBoost(worldRef.current, deviceId, true);
          bumpLocalInput();
        }
        if (!shouldTickWorld && activeRoom) {
          sendPlayerInput(activeRoom, isGlobalWorld, {
            deviceId,
            direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right",
            boosting: true,
          });
        }
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        if (boostingRef.current) playBoostEndSound();
        boostingRef.current = false;
        if (worldRef.current && shouldTickWorld) {
          setBoost(worldRef.current, deviceId, false);
        } else if (worldRef.current && !isGlobalWorld) {
          setBoost(worldRef.current, deviceId, false);
          bumpLocalInput();
        }
        if (!shouldTickWorld && activeRoom) {
          sendPlayerInput(activeRoom, isGlobalWorld, {
            deviceId,
            direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right",
            boosting: false,
          });
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleDirection, isSpectating, shouldTickWorld, deviceId, activeRoom, isGlobalWorld]);

  const handleRetry = useCallback(() => {
    if (!activeRoom || !worldRef.current) return;
    postDeath("replay");
    emitGameRetry("snake");
    recordSnakeRematch(activeRoom);
    recordSpectatorRejoin(activeRoom);

    const nickname = getLastNickname() || "Player";
    joinRoom(activeRoom, { nickname });

    boostingRef.current = false;
    setParticles([]);
    setScorePopups([]);
    prevAliveRef.current = true;
    prevTotalKillsRef.current = 0;
    zoomMultRef.current = 1;

    const next = structuredClone(worldRef.current);
    restartPlayerSnake(next, deviceId, nickname);
    applyLocalHead(next);
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
      renderAlphaRef.current = 0;
      for (const [id, s] of Object.entries(world.snakes)) {
        const prevS = prev.snakes[id];
        if (prevS && s && s.score > prevS.score) {
          eatPopUntilRef.current[id] = Date.now() + SNAKE_FEEL.eatPopAnimMs;
        }
      }
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
        setParticles((p) => spawnEatParticles(p, head.x, head.y, vis.color, isGlobalWorld ? Math.max(vis.particleCount, 6) : vis.particleCount));
        setScorePopups((pop) => spawnScorePopup(pop, head.x, head.y, delta, vis.color));
        const buf = me.gemsEaten ?? 0;
        setScorePopups((pop) =>
          spawnScorePopup(pop, head.x, head.y - 0.8, `${buf % 2}/2`, "#94a3b8")
        );
        if (isGlobalWorld) shakeRef.current = Math.max(shakeRef.current, 3);
        if (me.boosting) {
          setParticles((p) => spawnBoostTrail(p, head.x, head.y, me.color, 2));
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
        if (isGlobalWorld) shakeRef.current = 14;
      }
      if (prevMe && !prevMe.alive && me?.alive && isGlobalWorld) {
        setGoFlashUntil(Date.now() + 600);
        setSpawnHighlightUntil(Date.now() + SNAKE_MVP_RC1.spawnHighlightMs);
      }
      const kills = me?.totalKills ?? 0;
      if (kills > prevTotalKillsRef.current && me?.segments[0]) {
        playKillSound(prevTotalKillsRef.current === 0);
        if (isGlobalWorld) {
          shakeRef.current = Math.max(shakeRef.current, 10);
          const streak = me.killStreak ?? 1;
          const killLabel =
            streak >= 3 ? "Triple Kill!" : streak >= 2 ? "Double Kill!" : "+1 Kill";
          const head = me.segments[0]!;
          setScorePopups((pop) =>
            spawnScorePopup(pop, head.x, head.y - 1.8, killLabel, "#fbbf24")
          );
        }
      }
      prevTotalKillsRef.current = kills;
    }
    prevWorldRef.current = world;
  }, [world, deviceId, activeRoom, isGlobalWorld]);

  const toggleFullscreen = useCallback(async () => {
    const el = viewportRef.current;
    if (!el) return;
    if (isGameFullscreen) {
      await exitViewportFullscreen();
      setPseudoFullscreen(false);
      document.body.style.overflow = "";
      setIsFullscreen(false);
      return;
    }
    const mode = await enterViewportFullscreen(el);
    if (mode === "pseudo") {
      setPseudoFullscreen(true);
      document.body.style.overflow = "hidden";
    }
    setIsFullscreen(mode === "native" || mode === "pseudo");
  }, [isGameFullscreen]);

  useEffect(() => {
    const syncFs = () => {
      const native = isViewportFullscreen(viewportRef.current);
      setIsFullscreen(native || pseudoFullscreen);
      if (!native && !pseudoFullscreen) document.body.style.overflow = "";
    };
    document.addEventListener("fullscreenchange", syncFs);
    document.addEventListener("webkitfullscreenchange", syncFs);
    return () => {
      document.removeEventListener("fullscreenchange", syncFs);
      document.removeEventListener("webkitfullscreenchange", syncFs);
      document.body.style.overflow = "";
    };
  }, [pseudoFullscreen]);

  useEffect(() => {
    if (isLocalOnly || !activeRoom || !connected) return;

    const tryReconnect = () => {
      if (document.visibilityState !== "visible") return;
      const code = activeRoom;
      const existing = getRoom(code);
      if (existing?.players.some((p) => p.deviceId === deviceId)) return;
      const token = deviceId.slice(0, 8);
      const restored = replay(code, token);
      if (restored) {
        entryTrace("RECONNECT", "PASS", code);
        return;
      }
      void joinRoomAsync(code).catch(() => {
        entryTrace("RECONNECT", "FAIL", code);
      });
    };

    document.addEventListener("visibilitychange", tryReconnect);
    window.addEventListener("online", tryReconnect);
    return () => {
      document.removeEventListener("visibilitychange", tryReconnect);
      window.removeEventListener("online", tryReconnect);
    };
  }, [isLocalOnly, activeRoom, connected, deviceId]);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      diagFrame();
      frameCounterRef.current += 1;
      const snake = worldRef.current?.snakes[deviceId];
      const boosting = !!(snake?.alive && !snake.spectating && snake.boosting);
      const targetFov = boosting ? SNAKE_FEEL.boostFovScale : 1;
      zoomMultRef.current +=
        (targetFov - zoomMultRef.current) * SNAKE_FEEL.cameraZoomLerp;

      const layout = camLayoutRef.current;
      let camTarget: Vec | null = null;
      if (bossCam) {
        camTarget = { x: bossCam.x, y: bossCam.y };
      } else if (isSpectating) {
        camTarget = resolveSnakeHead(watchSnake ?? undefined);
      } else if (snake?.alive && !snake.spectating) {
        camTarget = resolveSnakeHead(snake);
      }
      if (camTarget && layout.cellSize > 0) {
        const targetX = camTarget.x * layout.cellSize - layout.camHalf;
        const targetY = camTarget.y * layout.cellSize - layout.camHalf;
        const lerp = SNAKE_FEEL.cameraFollowLerp;
        camRef.current.x += (targetX - camRef.current.x) * lerp;
        camRef.current.y += (targetY - camRef.current.y) * lerp;
      }

      const localSnake = worldRef.current?.snakes[deviceId];
      if (isGlobalWorld && localSnake?.alive && localSnake.boosting && frameCounterRef.current % 2 === 0) {
        const head = resolveSnakeHead(localSnake);
        if (head) {
          setParticles((p) => spawnBoostTrail(p, head.x, head.y, localSnake.color, 1.5));
        }
      }

      shakeRef.current = shakeIntensity(shakeRef.current, 0);
      const shakeX = shakeRef.current > 0.4 ? (Math.random() - 0.5) * shakeRef.current * 2 : 0;
      const shakeY = shakeRef.current > 0.4 ? (Math.random() - 0.5) * shakeRef.current * 2 : 0;

      const layer = worldLayerRef.current;
      if (layer && layout.cellSize > 0) {
        layer.style.transform = `translate(${-camRef.current.x + shakeX}px, ${-camRef.current.y + shakeY}px) scale(${zoomMultRef.current})`;
        layer.style.transformOrigin = `${layout.camHalf + camRef.current.x}px ${layout.camHalf + camRef.current.y}px`;
      }

      renderAlphaRef.current = Math.min(1, renderAlphaRef.current + SNAKE_FEEL.segmentLerpStep);
      if (frameCounterRef.current % 2 === 0) {
        setRenderAlpha(renderAlphaRef.current);
      }
      if (frameCounterRef.current % 3 === 0) {
        setParticles((p) => tickParticles(p));
        setScorePopups((pop) => tickScorePopups(pop));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [deviceId, isSpectating, bossCam, watchSnake, isGlobalWorld]);

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
    const room = getRoom(activeRoom) ?? (isLocalOnly && world
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
  const baseCellRaw =
    (boardPx / SNAKE_FEEL.viewportCellsVisible) *
    matchRule.cameraZoomMult *
    SNAKE_FEEL.baseCameraZoom;
  const baseCellSize = Math.min(
    SNAKE_FEEL.maxCellPx,
    Math.max(SNAKE_FEEL.minCellPx, baseCellRaw)
  );
  const cellSize = baseCellSize;
  const myLength = mySnake ? getSegmentCount(mySnake) : 0;
  const myKills = mySnake?.totalKills ?? 0;
  const myScore = mySnake?.score ?? 0;
  const camHalf = boardPx / 2;
  camLayoutRef.current = { boardPx, cellSize: baseCellSize, camHalf };

  const camX = camRef.current.x;
  const camY = camRef.current.y;
  const top1Id = world.rankings[0]?.deviceId ?? null;
  const rankingEntries = top10.slice(0, 10).map((r) => ({
    deviceId: r.deviceId,
    nickname: r.nickname,
    length: world.snakes[r.deviceId] ? getSegmentCount(world.snakes[r.deviceId]!) : "?",
  }));

  return (
    <div
      ref={boardRef}
      className={cn(
        "relative mx-auto flex w-full flex-col items-center overflow-hidden",
        worldLayout
          ? "fixed inset-0 z-[110] h-[100dvh] w-[100dvw] max-w-none bg-black px-0"
          : isGameFullscreen
            ? "max-w-none px-0"
            : "max-w-6xl px-1 sm:px-2"
      )}
    >
      <div
        className={cn(
          "flex w-full items-start justify-center gap-3",
          (worldLayout || isGameFullscreen) && "h-full"
        )}
      >
        <aside className="hidden w-40 shrink-0 pt-10 lg:block">
          <SnakeRankingPanel entries={rankingEntries} deviceId={deviceId} />
        </aside>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center",
          worldLayout ? "h-full justify-center pb-0" : "pb-[calc(8.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
        )}
      >
      <div
        ref={viewportRef}
        className={cn(
          "relative flex w-full justify-center overflow-hidden bg-black",
          worldLayout || isGameFullscreen
            ? "h-full w-full items-center justify-center"
            : "[&:fullscreen]:flex [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:items-center [&:fullscreen]:justify-center"
        )}
      >
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="absolute right-2 top-2 z-40 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/80"
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
        >
          {isFullscreen ? "⛶ Exit" : "⛶ Full Screen"}
        </button>

        {/* Game canvas wrapper — square board; fullscreen uses largest fitting size */}
        <div
          className="relative"
          style={{
            width: boardPx,
            height: boardPx,
            maxWidth: worldLayout ? "min(100dvw, 100dvh)" : "min(100vw, 100dvh)",
            maxHeight: worldLayout ? "min(100dvw, 100dvh)" : "min(100vw, 100dvh)",
          }}
        >
        <div
          className={cn(
            "relative h-full w-full touch-none overflow-hidden border border-white/10",
            worldLayout ? "rounded-none border-0" : "rounded-xl"
          )}
          style={{
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
        {mySnake?.alive && !isSpectating && !awaitingInput ? (
          <div className="pointer-events-auto absolute left-2 top-2 z-40 flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-white/20 bg-black/70 px-2.5 text-xs text-white hover:bg-black/90"
              onClick={handleQuitGame}
            >
              나가기
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-white/20 bg-black/70 px-2.5 text-xs text-white hover:bg-black/90"
              onClick={() => setIsPaused(true)}
            >
              Pause
            </Button>
          </div>
        ) : null}

        {isPaused ? (
          <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/75 backdrop-blur-sm">
            <p className="text-lg font-semibold text-white">Paused</p>
            <Button type="button" size="sm" onClick={() => setIsPaused(false)}>
              Resume
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleQuitGame}>
              Exit
            </Button>
          </div>
        ) : null}

        {isGlobalWorld && !immersivePlay ? (
          <SnakeWorldHud
            className="absolute right-2 top-12 z-40"
            roomCode={effectiveRoomCode}
            players={worldHudPlayers}
            bots={worldHudBots}
            pingMs={worldHudPing}
            fps={worldHudFps}
            tickHz={worldTickHz}
            isHost={isHost}
          />
        ) : null}

        {/* Kill Feed — WORLD sync via host state */}
        {isGlobalWorld && !immersivePlay && world.killFeed.length > 0 ? (
          <div className="pointer-events-none absolute right-2 top-[11.5rem] z-30 max-w-[11rem] space-y-1">
            {world.killFeed.slice(0, 5).map((entry) => (
              <div
                key={`${entry.tick}-${entry.killerId}-${entry.victimId}`}
                className="rounded border border-white/10 bg-black/60 px-2 py-1 text-[10px] text-white/90 backdrop-blur-sm"
              >
                <span className="font-semibold text-amber-300">{entry.killerName}</span>
                {" killed "}
                <span className="font-semibold text-red-300">{entry.victimName}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* HUD — minimal in immersive WORLD play */}
        <div
          className={cn(
            "pointer-events-none absolute z-30 rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs backdrop-blur-sm",
            immersivePlay ? "left-2 top-2" : "left-2 top-12"
          )}
        >
          <p className="font-bold text-white">
            Length <span className="text-emerald-300">{myLength}</span>
          </p>
          {!immersivePlay ? (
            <>
              <p className="mt-0.5 text-muted-foreground">Kills <span className="text-amber-300">{myKills}</span></p>
              <p className={cn("mt-0.5", isBoosting ? "font-semibold text-amber-300" : "text-white/40")}>
                {isBoosting ? "⚡ BOOST" : "Boost"}
              </p>
            </>
          ) : null}
        </div>
          <div
            ref={worldLayerRef}
            className="absolute origin-top-left"
            style={{
              width: worldSize * cellSize,
              height: worldSize * cellSize,
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
              const tailPopScale = growing
                ? 0.9 + Math.sin((1 - Math.max(0, growthLeft) / SNAKE_FEEL.growthAnimMs) * Math.PI) * 0.2
                : 1;
              const eatPopLeft = (eatPopUntilRef.current[snake.deviceId] ?? 0) - Date.now();
              const eatPopScale =
                eatPopLeft > 0
                  ? 1 +
                    (SNAKE_FEEL.eatPopPeak - 1) *
                      Math.sin((1 - Math.max(0, eatPopLeft) / SNAKE_FEEL.eatPopAnimMs) * Math.PI)
                  : 1;
              const radiusScale = snake.bodyRadiusScale ?? 1;
              const len = segs.length;
              const headRad = ((snake.angle ?? 0) * 180) / Math.PI;
              const isMe = snake.deviceId === deviceId;
              const highlight = isMe && spawnHighlightUntil > Date.now();
              if (isMe && segs[0] && snake.segments[0] && world.tick % 8 === 0) {
                const phys = snake.segments[0]!;
                const rend = segs[0]!;
                const headXY =
                  snake.headX != null && snake.headY != null
                    ? { x: snake.headX, y: snake.headY }
                    : null;
                noteFixDeath001Sample({
                  tick: world.tick,
                  deviceId: snake.deviceId,
                  physicsSeg0: { x: phys.x, y: phys.y },
                  headXY,
                  deltaPhysicsVsHeadXY:
                    headXY != null ? Math.hypot(phys.x - headXY.x, phys.y - headXY.y) : null,
                  renderHead: { x: rend.x, y: rend.y },
                  deltaPhysicsVsRender: Math.hypot(phys.x - rend.x, phys.y - rend.y),
                });
              }
              return segs.map((seg, i) => {
                const isHead = i === 0;
                const isTail = i === len - 1;
              const segBase = cellSize * 0.72;
                const segSize = isHead
                  ? segBase * SNAKE_MVP_RC1.headScale
                  : isTail
                    ? segBase * SNAKE_MVP_RC1.tailScale
                    : segBase * SNAKE_MVP_RC1.bodyScale;
                const growthScale = growing && i >= len - 2 ? tailPopScale : 1;
                const size = segSize * radiusScale * eatPopScale * growthScale;
                const pulse = highlight ? 1 + Math.sin(Date.now() / 120) * 0.12 : 1;
                const fill = segmentBodyColor(snake, i);
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
                      backgroundColor: fill,
                      opacity: isTail ? 0.75 : isHead ? 1 : 0.92,
                      boxShadow: highlight
                        ? "0 0 18px rgba(255,255,255,0.95), 0 0 28px rgba(255,255,255,0.45)"
                        : isHead
                          ? snake.invincibleUntil && Date.now() < snake.invincibleUntil
                            ? "0 0 10px white"
                            : snake.boosting
                              ? `0 0 14px ${fill}, 0 0 20px #fbbf2488`
                              : `0 0 8px ${fill}`
                          : undefined,
                      transform: isHead ? `rotate(${headRad}deg)` : undefined,
                    }}
                  >
                    {isHead && snake.headCharacter ? (
                      <span
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        style={{ fontSize: Math.max(8, size * 0.72), lineHeight: 1 }}
                        aria-hidden
                      >
                        {resolveHeadEmoji(snake.headCharacter)}
                      </span>
                    ) : null}
                  </div>
                );
              });
            })}
            {Object.values(world.snakes).map((snake) => {
              if (!snake.alive || !snake.segments[0]) return null;
              const head = resolveSnakeHead(snake);
              if (!head) return null;
              const isMe = snake.deviceId === deviceId;
              const isLeader = snake.deviceId === top1Id;
              const myHead = resolveSnakeHead(worldRef.current?.snakes[deviceId] ?? mySnake);
              const dist = myHead ? Math.hypot(head.x - myHead.x, head.y - myHead.y) : 999;
              const nameFade = isMe ? 1 : Math.max(0.22, 1 - dist / 30);
              if (!isMe && dist > 32) return null;
              const label = isMe ? "YOU" : snake.nickname.slice(0, 8);
              return (
                <div
                  key={`label-${snake.deviceId}`}
                  className="pointer-events-none absolute z-20 whitespace-nowrap text-[9px] font-bold"
                  style={{
                    left: head.x * cellSize,
                    top: head.y * cellSize - cellSize * (isLeader ? 1.55 : 1.1),
                    color: isMe ? "#fde047" : `rgba(255,255,255,${0.75 * nameFade})`,
                    opacity: nameFade,
                    textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                  }}
                >
                  {isLeader ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] leading-none" aria-hidden>
                      👑
                    </span>
                  ) : null}
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


        {/* MVP HUD — bottom global rank bar (desktop in-canvas) */}
        {!immersivePlay ? (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-30 hidden justify-center lg:flex">
          <div className="rounded-lg border border-white/10 bg-black/55 px-4 py-1.5 text-center text-[11px] backdrop-blur-sm">
            {isStageMode && stageConfig ? (
              <>
                <p className="font-semibold tracking-wide text-violet-300">{stageConfig.label}</p>
                <p className="mt-0.5 text-white/85">
                  Goal <span className="font-bold text-amber-300">{stageConfig.scoreTarget}</span>
                  {" · "}
                  Speed <span className="font-bold text-sky-300">{stageConfig.speedMult.toFixed(2)}×</span>
                  {stageConfig.aiCount > 0 ? (
                    <>
                      {" · "}
                      AI <span className="font-bold text-rose-300">{stageConfig.aiCount}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-0.5 text-white/70">
                  Score <span className="font-bold text-emerald-300">{currentStageScore()}</span>
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold tracking-wide text-amber-300">GLOBAL RANK #{myRank}</p>
                <p className="mt-0.5 text-white/70">오늘 순위 #{myRank}</p>
                <p className="mt-0.5 text-white/85">
                  Length <span className="font-bold text-emerald-300">{myLength}</span>
                  {" · "}
                  Kills <span className="font-bold text-amber-300">{myKills}</span>
                </p>
              </>
            )}
          </div>
        </div>
        ) : null}
        </div>
      </div>

        {!immersivePlay ? (
        <div className="mt-2 flex w-full max-w-sm items-start gap-2 px-1 lg:hidden">
          <SnakeRankingPanel
            compact
            entries={rankingEntries}
            deviceId={deviceId}
            className="min-w-0 flex-1"
          />
          {showMinimap ? (
            <SnakeMinimap
              compact
              snakes={Object.values(world.snakes)}
              worldSize={worldSize}
              deviceId={deviceId}
              top1Id={top1Id}
              camX={camX}
              camY={camY}
              viewPx={boardPx}
              cellSize={cellSize}
            />
          ) : null}
        </div>
        ) : null}
      </div>

        {!immersivePlay ? (
        <aside className="hidden w-28 shrink-0 pt-10 lg:block">
          {showMinimap ? (
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
          ) : null}
        </aside>
        ) : null}
      </div>

      {isStageMode && stageOverlay !== "none" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="relative h-[min(100%,28rem)] w-full max-w-sm rounded-xl">
            {stageOverlay === "stage-clear" ? (
              <GameOverOverlay
                variant="stage-clear"
                stageLabel={`${stageConfig?.label ?? "Stage"} Clear!`}
                score={currentStageScore()}
                gameSlug="snake"
                onRestart={() => {}}
                onNextStage={handleNextStage}
                onExit={handleStageExit}
              />
            ) : (
              <GameOverOverlay
                variant="game-over"
                message={stageOverlay === "run-complete" ? "All Stages Clear!" : undefined}
                score={currentStageScore()}
                gameSlug="snake"
                onRestart={() => {}}
                onRetry={handleStageRetry}
                onExit={handleStageExit}
              />
            )}
          </div>
        </div>
      ) : null}

      {!isStageMode && isGlobalWorld && mySnake && !mySnake.alive && respawnSec != null && respawnSec > 0 ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40">
          <p className="text-7xl font-black tabular-nums text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.5)]">
            {respawnSec}
          </p>
          <p className="mt-2 text-sm font-semibold tracking-widest text-white/80">RESPAWN</p>
        </div>
      ) : null}

      {!isStageMode && mySnake && !mySnake.alive && !isGlobalWorld ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="relative h-[min(100%,28rem)] w-full max-w-sm rounded-xl">
            <GameOverOverlay
              variant="game-over"
              score={Math.round(mySnake.score ?? 0)}
              gameSlug="snake"
              onRestart={() => {}}
              onRetry={handleRetry}
              onExit={() => {
                emitGameExit("snake");
                postDeath("exit");
                if (activeRoom && !isLocalOnly) {
                  try {
                    leaveRoom(activeRoom);
                  } catch {
                    /* ignore */
                  }
                }
              }}
            />
          </div>
        </div>
      ) : null}

      {!isSpectating && mySnake?.alive && !awaitingInput && !isPaused ? (
        <SnakeMobileControls
          onDirection={handleDirection}
          onBoostStart={() => {
            if (getSegmentCount(mySnake) <= SNAKE_FEEL.boostMinSegments) return;
            if (!boostingRef.current) {
              playBoostSound();
              if (isGlobalWorld) shakeRef.current = Math.max(shakeRef.current, 4);
            }
            boostingRef.current = true;
            if (worldRef.current && shouldTickWorld) {
              setBoost(worldRef.current, deviceId, true);
            } else if (worldRef.current && !isGlobalWorld) {
              setBoost(worldRef.current, deviceId, true);
              bumpLocalInput();
            }
            if (!shouldTickWorld && activeRoom) {
              sendPlayerInput(activeRoom, isGlobalWorld, {
                deviceId,
                direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right",
                boosting: true,
              });
            }
          }}
          onBoostEnd={() => {
            if (boostingRef.current) playBoostEndSound();
            boostingRef.current = false;
            if (worldRef.current && shouldTickWorld) {
              setBoost(worldRef.current, deviceId, false);
            } else if (worldRef.current && !isGlobalWorld) {
              setBoost(worldRef.current, deviceId, false);
              bumpLocalInput();
            }
            if (!shouldTickWorld && activeRoom) {
              sendPlayerInput(activeRoom, isGlobalWorld, {
                deviceId,
                direction: worldRef.current?.snakes[deviceId]?.pendingDirection ?? "right",
                boosting: false,
              });
            }
          }}
          boosting={!!isBoosting}
          boostReady={getSegmentCount(mySnake) > SNAKE_FEEL.boostMinSegments}
        />
      ) : null}
    </div>
  );
}
