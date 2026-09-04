"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDeviceId,
  getLastNickname,
  MP_PLAYER_COLORS,
  MultiplayerEntrySelect,
  MultiplayerPlayShell,
  type MpStyleOption,
} from "@game-platform/game-sdk";
import {
  createRoom,
  ensureRoom,
  getRoom,
  joinRoom,
  joinRoomAsync,
  leaveRoom,
  send,
  subscribeRoom,
  sync,
} from "@game-platform/multiplayer-sdk";

import {
  RF_CELL,
  RF_GRID,
  RF_TICK_MS,
  RF_MAX_PLAYERS,
  RF_VICTORY_PCT,
  RF_EXPAND_COST,
  applyRfAction,
  applyRfSyncState,
  canAttack,
  canBuild,
  canExpand,
  cellAt,
  createRfWorld,
  findExpandTargets,
  findNearestEnemy,
  localNation,
  nationCenter,
  reconcileHumans,
  restartRfRound,
  rfQaForceWin,
  serializeRfState,
  terrainExpandCost,
  terrainLabel,
  tickRfWorld,
  type HumanSeat,
  type RfAction,
  type RfSyncState,
  type RfWorld,
} from "./re-front-engine";
import {
  advanceMissionAfterAttack,
  advanceMissionAfterCounterSeen,
  advanceMissionAfterDefend,
  advanceMissionAfterExpand,
  advanceMissionAfterGrowTimer,
  createMissionState,
  missionObjective,
  type RfMissionState,
} from "./re-front-missions";

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.8;

const RF_STYLES: MpStyleOption[] = [
  { id: "cyan", label: "Cyan", emoji: "🔵", color: MP_PLAYER_COLORS[0]! },
  { id: "pink", label: "Pink", emoji: "🩷", color: MP_PLAYER_COLORS[1]! },
  { id: "gold", label: "Gold", emoji: "🟡", color: MP_PLAYER_COLORS[2]! },
  { id: "green", label: "Green", emoji: "🟢", color: MP_PLAYER_COLORS[3]! },
];

const TERRAIN_FILL = ["#1e3a2f", "#3d3520", "#2d3748"] as const;
const HIGHLIGHT_NEUTRAL = "rgba(74, 222, 128, 0.45)";

function resolveRoomCode(): string {
  if (typeof window === "undefined") return "RF-LOBBY";
  const q = new URLSearchParams(window.location.search).get("room");
  return (q && q.trim()) || "RF-LOBBY";
}

function snapWorld(w: RfWorld): RfWorld {
  return {
    ...w,
    owner: new Uint8Array(w.owner),
    terrain: new Uint8Array(w.terrain),
    buildings: new Uint8Array(w.buildings),
    nations: Object.fromEntries(Object.entries(w.nations).map(([k, n]) => [k, { ...n }])),
    slotToId: { ...w.slotToId },
    idToSlot: { ...w.idToSlot },
    flashes: w.flashes.map((f) => ({ ...f })),
    popups: w.popups.map((p) => ({ ...p })),
    rankings: w.rankings.slice(),
    battle: w.battle ? { ...w.battle } : null,
  };
}

function collectHumans(code: string, localId: string, nickname: string, color: string): HumanSeat[] {
  const room = getRoom(code);
  const hostId = room?.hostId;
  const fromRoom =
    room?.players.map((p) => ({
      id: p.deviceId,
      nickname: p.nickname || "Player",
      color: p.deviceId === localId ? color : undefined,
    })) ?? [];
  let list = fromRoom.some((h) => h.id === localId)
    ? fromRoom
    : [{ id: localId, nickname, color }, ...fromRoom];
  if (hostId) {
    list = [...list.filter((h) => h.id === hostId), ...list.filter((h) => h.id !== hostId)];
  }
  return list.slice(0, RF_MAX_PLAYERS);
}

function isSimHost(code: string, deviceId: string, lastStateAt: number, startedAt: number): boolean {
  const room = sync(code) ?? getRoom(code);
  if (!room) return true;
  if (room.hostId === deviceId) return true;
  const hostPresent = room.players.some((p) => p.deviceId === room.hostId);
  if (!hostPresent) return true;
  if (room.players.length <= 1) return true;
  const now = Date.now();
  if (lastStateAt <= 0 && now - startedAt > 400) return true;
  if (lastStateAt > 0 && now - lastStateAt > 1200) return true;
  return false;
}

function screenToCell(
  sx: number,
  sy: number,
  viewW: number,
  viewH: number,
  cam: { x: number; y: number },
  zoom: number
): { cx: number; cy: number } | null {
  const mapPx = RF_GRID * RF_CELL * zoom;
  const ox = (viewW - mapPx) / 2 - cam.x * RF_CELL * zoom;
  const oy = (viewH - mapPx) / 2 - cam.y * RF_CELL * zoom;
  const cx = Math.floor((sx - ox) / (RF_CELL * zoom));
  const cy = Math.floor((sy - oy) / (RF_CELL * zoom));
  if (cx < 0 || cy < 0 || cx >= RF_GRID || cy >= RF_GRID) return null;
  return { cx, cy };
}

function HowToPlayModal({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-400/40 bg-slate-900 p-6 text-white shadow-2xl"
        data-testid="rf-how-to-play"
      >
        <h2 className="text-2xl font-bold text-violet-200">Re:Front</h2>
        <p className="mt-2 text-sm text-slate-300">
          작은 나라에서 시작해 땅을 넓히고, 군대를 키우고, 주변국과 싸워 세계를 차지하는 실시간 전략 게임
        </p>
        <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-amber-300">How to Play</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
          <li>🖱️ <strong>내 영토 / 맵 클릭</strong> → 행동 메뉴</li>
          <li>➕ <strong>EXPAND</strong> → 주변 중립 영토 점령</li>
          <li>⚔️ <strong>ATTACK</strong> → 적 영토 공격</li>
          <li>🛡️ <strong>DEFEND</strong> → 국경 방어 강화</li>
          <li>💰 Gold · 👥 Population · ⚔️ Troops → 행동에 사용</li>
          <li>🏆 <strong>{RF_VICTORY_PCT}%</strong> 영토 = 승리</li>
        </ul>
        <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-cyan-300">Controls</h3>
        <ul className="mt-2 space-y-1 text-xs text-slate-400">
          <li>🖱️ Click — select territory</li>
          <li>WASD / ↑↓←→ — pan map (camera)</li>
          <li>Wheel — zoom in / out</li>
          <li>ESC — clear selection</li>
        </ul>
        <button
          type="button"
          onClick={onStart}
          className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-base font-bold text-white hover:bg-violet-500"
          data-testid="rf-how-to-play-start"
        >
          START — Expand your first lands
        </button>
      </div>
    </div>
  );
}

export function ReFrontGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "Commander", []);
  const roomCode = useMemo(() => resolveRoomCode(), []);

  const [world, setWorld] = useState<RfWorld>(() => createRfWorld(deviceId, nickname));
  const worldRef = useRef(world);
  worldRef.current = world;

  const [started, setStarted] = useState(false);
  const [styleId, setStyleId] = useState(RF_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const [selected, setSelected] = useState<{ cx: number; cy: number } | null>(null);
  const [cam, setCam] = useState({ x: RF_GRID / 2, y: RF_GRID / 2 });
  const [zoom, setZoom] = useState(0.85);
  const [isHost, setIsHost] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [attackPct, setAttackPct] = useState(0.5);
  const [mission, setMission] = useState<RfMissionState>(() => createMissionState());
  const [viewSize, setViewSize] = useState({ w: 800, h: 520 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef(Date.now());
  const lastHostStateAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  const me = localNation(world, deviceId);
  const objective = missionObjective(mission);
  const expandHints = useMemo(
    () => (mission.phase === "expand" ? findExpandTargets(world, deviceId, 8) : []),
    [world, deviceId, mission.phase]
  );
  const nearestEnemy = useMemo(() => findNearestEnemy(world, deviceId), [world, deviceId]);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setViewSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [started]);

  useEffect(() => {
    if (mission.phase !== "grow") return;
    const t = window.setTimeout(() => {
      setMission((m) => advanceMissionAfterGrowTimer(m));
    }, 2800);
    return () => clearTimeout(t);
  }, [mission.phase]);

  useEffect(() => {
    if (world.pendingCounterAttack && !mission.counterSeen) {
      setMission((m) => advanceMissionAfterCounterSeen(m));
    }
  }, [world.pendingCounterAttack, mission.counterSeen]);

  const centerOnPlayer = useCallback(() => {
    const c = nationCenter(worldRef.current, deviceId);
    if (c) setCam({ x: c.cx, y: c.cy });
  }, [deviceId]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const w = worldRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w: viewW, h: viewH } = viewSize;
    canvas.width = viewW;
    canvas.height = viewH;

    const mapPx = RF_GRID * RF_CELL * zoom;
    const ox = (viewW - mapPx) / 2 - cam.x * RF_CELL * zoom;
    const oy = (viewH - mapPx) / 2 - cam.y * RF_CELL * zoom;

    ctx.fillStyle = "#060a12";
    ctx.fillRect(0, 0, viewW, viewH);

    const hintSet = new Set(expandHints.map((h) => `${h.cx},${h.cy}`));

    for (let cy = 0; cy < RF_GRID; cy++) {
      for (let cx = 0; cx < RF_GRID; cx++) {
        const i = cy * RF_GRID + cx;
        const slot = w.owner[i]!;
        const terrain = w.terrain[i]!;
        const sx = ox + cx * RF_CELL * zoom;
        const sy = oy + cy * RF_CELL * zoom;
        const sz = RF_CELL * zoom + 0.5;

        if (slot === 0) {
          ctx.fillStyle = TERRAIN_FILL[terrain] ?? TERRAIN_FILL[0];
        } else {
          const id = w.slotToId[slot];
          const n = id ? w.nations[id] : undefined;
          ctx.fillStyle = n?.color ?? "#64748b";
          if (n && !n.alive) ctx.fillStyle = "#334155";
        }
        ctx.fillRect(sx, sy, sz, sz);

        if (slot === 0 && hintSet.has(`${cx},${cy}`)) {
          ctx.fillStyle = HIGHLIGHT_NEUTRAL;
          ctx.fillRect(sx, sy, sz, sz);
        }

        const b = w.buildings[i];
        if (b === 1) {
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(sx + sz * 0.3, sy + sz * 0.3, sz * 0.4, sz * 0.4);
        } else if (b === 2) {
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx + 1, sy + 1, sz - 2, sz - 2);
        }
      }
    }

    for (const f of w.flashes) {
      if (f.until <= Date.now()) continue;
      const sx = ox + f.cx * RF_CELL * zoom;
      const sy = oy + f.cy * RF_CELL * zoom;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, RF_CELL * zoom, RF_CELL * zoom);
    }

    if (selected) {
      const sx = ox + selected.cx * RF_CELL * zoom;
      const sy = oy + selected.cy * RF_CELL * zoom;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 1, sy - 1, RF_CELL * zoom + 2, RF_CELL * zoom + 2);
    }
  }, [cam, expandHints, selected, viewSize, zoom]);

  useEffect(() => {
    draw();
  }, [world, draw, nowMs]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!started || world.roundOver) return;
    const pan = () => {
      const speed = 0.35 / zoom;
      let dx = 0;
      let dy = 0;
      const k = keysRef.current;
      if (k.has("w") || k.has("arrowup")) dy -= speed;
      if (k.has("s") || k.has("arrowdown")) dy += speed;
      if (k.has("a") || k.has("arrowleft")) dx -= speed;
      if (k.has("d") || k.has("arrowright")) dx += speed;
      if (dx || dy) setCam((c) => ({ x: c.x + dx, y: c.y + dy }));
    };
    const id = setInterval(pan, 32);
    return () => clearInterval(id);
  }, [started, world.roundOver, zoom]);

  useEffect(() => {
    if (!started) return;
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === "Escape") setSelected(null);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [started]);

  const dispatchAction = useCallback(
    (action: RfAction) => {
      const w = snapWorld(worldRef.current);
      const host = isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current);
      if (host) {
        const ok = applyRfAction(w, action);
        if (ok) {
          tickRfWorld(w);
          setWorld(w);
          send(roomCode, "state", serializeRfState(w));
          lastHostStateAtRef.current = Date.now();
        }
        return ok;
      }
      send(roomCode, "rf:action", action);
      return true;
    },
    [deviceId, roomCode]
  );

  const onExpand = useCallback(() => {
    if (!selected || !me?.alive) return;
    const ok = dispatchAction({ type: "expand", cx: selected.cx, cy: selected.cy, nationId: deviceId });
    if (ok) setMission((m) => advanceMissionAfterExpand(m));
  }, [deviceId, dispatchAction, me?.alive, selected]);

  const onAttack = useCallback(() => {
    if (!selected || !me?.alive) return;
    const ok = dispatchAction({
      type: "attack",
      cx: selected.cx,
      cy: selected.cy,
      nationId: deviceId,
      pct: attackPct,
    });
    if (ok) setMission((m) => advanceMissionAfterAttack(m));
  }, [attackPct, deviceId, dispatchAction, me?.alive, selected]);

  const onDefend = useCallback(() => {
    if (!me?.alive) return;
    const ok = dispatchAction({ type: "defend", nationId: deviceId });
    if (ok) setMission((m) => advanceMissionAfterDefend(m));
  }, [deviceId, dispatchAction, me?.alive]);

  const onBuild = useCallback(
    (kind: "city" | "defense") => {
      if (!selected || !me?.alive) return;
      dispatchAction({ type: "build", cx: selected.cx, cy: selected.cy, nationId: deviceId, kind });
    },
    [deviceId, dispatchAction, me?.alive, selected]
  );

  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const cell = screenToCell(sx, sy, viewSize.w, viewSize.h, cam, zoom);
      if (cell) setSelected(cell);
    },
    [cam, viewSize.h, viewSize.w, zoom]
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.001)));
  }, []);

  const startGame = useCallback(async () => {
    try {
      await ensureRoom(roomCode);
      let room = await joinRoomAsync(roomCode, {
        nickname,
        gameSlug: "re-front",
        maxPlayers: RF_MAX_PLAYERS,
      });
      if (!room && !getRoom(roomCode)) {
        createRoom({
          gameSlug: "re-front",
          maxPlayers: RF_MAX_PLAYERS,
          code: roomCode,
          matchMode: "private",
        });
        joinRoom(roomCode, { nickname, gameSlug: "re-front", maxPlayers: RF_MAX_PLAYERS });
      }
    } catch {
      if (!getRoom(roomCode)) {
        createRoom({
          gameSlug: "re-front",
          maxPlayers: RF_MAX_PLAYERS,
          code: roomCode,
          matchMode: "private",
        });
      }
      joinRoom(roomCode, { nickname, gameSlug: "re-front", maxPlayers: RF_MAX_PLAYERS });
    }

    const humans = collectHumans(roomCode, deviceId, nickname, color);
    const w = createRfWorld(deviceId, nickname, humans);
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mp_qa_local")) {
      w.fastVictoryPct = 15;
    }
    reconcileHumans(w, humans);
    worldRef.current = w;
    setWorld(w);
    setStarted(true);
    setMission(createMissionState());
    startedAtRef.current = Date.now();
    centerOnPlayer();

    const host = isSimHost(roomCode, deviceId, 0, startedAtRef.current);
    setIsHost(host);
    if (host) send(roomCode, "state", serializeRfState(w));

    unsubRef.current?.();
    unsubRef.current = subscribeRoom(roomCode, (room) => {
      const gs = room.gameState ?? {};
      const last = String(gs._lastEvent ?? "");
      const amHost = isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current);
      setIsHost(amHost);

      if (last === "rf:rematch" && amHost) {
        const h = collectHumans(roomCode, deviceId, nickname, color);
        const local = snapWorld(worldRef.current);
        restartRfRound(local, deviceId, nickname, h);
        worldRef.current = local;
        setWorld(local);
        setMission(createMissionState());
        send(roomCode, "state", serializeRfState(local));
        lastHostStateAtRef.current = Date.now();
        return;
      }

      if (last === "rf:action" && gs["rf:action"] && amHost) {
        const action = gs["rf:action"] as RfAction;
        const local = snapWorld(worldRef.current);
        applyRfAction(local, action);
        tickRfWorld(local);
        worldRef.current = local;
        setWorld(local);
        send(roomCode, "state", serializeRfState(local));
        lastHostStateAtRef.current = Date.now();
        return;
      }

      if (last === "state" && gs.state && !amHost) {
        const state = gs.state as RfSyncState;
        lastHostStateAtRef.current = Date.now();
        const local = snapWorld(worldRef.current);
        applyRfSyncState(local, state, { rejectStaleTick: true });
        worldRef.current = local;
        setWorld(local);
      }
    });

    tickRef.current = setInterval(() => {
      const simHost = isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current);
      if (!simHost) return;
      const local = snapWorld(worldRef.current);
      if (local.roundOver) return;
      tickRfWorld(local);
      worldRef.current = local;
      setWorld(local);
      send(roomCode, "state", serializeRfState(local));
      lastHostStateAtRef.current = Date.now();
    }, RF_TICK_MS);
  }, [centerOnPlayer, color, deviceId, nickname, roomCode]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      unsubRef.current?.();
      leaveRoom(roomCode);
    };
  }, [roomCode]);

  const onRematch = useCallback(() => {
    send(roomCode, "rf:rematch", { at: Date.now() });
    const simHost = isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current);
    if (simHost) {
      const humans = collectHumans(roomCode, deviceId, nickname, color);
      const w = snapWorld(worldRef.current);
      restartRfRound(w, deviceId, nickname, humans);
      worldRef.current = w;
      setWorld(w);
      setMission(createMissionState());
      send(roomCode, "state", serializeRfState(w));
    }
    setSelected(null);
    centerOnPlayer();
  }, [centerOnPlayer, color, deviceId, nickname, roomCode]);

  const onExit = useCallback(() => {
    leaveRoom(roomCode);
    window.location.href = "/games/re-front";
  }, [roomCode]);

  const onAnotherGame = useCallback(() => {
    leaveRoom(roomCode);
    window.location.href = "/games";
  }, [roomCode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as { __RF_QA__?: () => unknown }).__RF_QA__ = () => ({
      deviceId,
      isHost,
      tick: worldRef.current.tick,
      mission,
      me: localNation(worldRef.current, deviceId),
    });
    (window as unknown as { __RF_QA_ACTION__?: (type: string, cx: number, cy: number) => boolean }).__RF_QA_ACTION__ =
      (type, cx, cy) => {
        const action: RfAction =
          type === "attack"
            ? { type: "attack", cx, cy, nationId: deviceId, pct: 0.5 }
            : { type: "expand", cx, cy, nationId: deviceId };
        return dispatchAction(action) as boolean;
      };
    (window as unknown as { __RF_QA_WIN__?: () => void }).__RF_QA_WIN__ = () => {
      const w = snapWorld(worldRef.current);
      rfQaForceWin(w, deviceId);
      worldRef.current = w;
      setWorld(w);
      send(roomCode, "state", serializeRfState(w));
    };
  }, [deviceId, dispatchAction, isHost, mission, roomCode]);

  const selectedInfo = selected ? cellAt(world, selected.cx, selected.cy) : null;
  const canExp = selected && me ? canExpand(world, selected.cx, selected.cy, deviceId) : false;
  const canAtk = selected && me ? canAttack(world, selected.cx, selected.cy, deviceId) : false;
  const canCity = selected && me ? canBuild(world, selected.cx, selected.cy, deviceId, "city") : false;
  const canDefPost = selected && me ? canBuild(world, selected.cx, selected.cy, deviceId, "defense") : false;
  const expandCost = selected ? terrainExpandCost(world, selected.cx, selected.cy) : RF_EXPAND_COST;

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Re:Front"
        subtitle="영토를 넓히고 적을 공격해 세계를 지배하세요"
        styles={RF_STYLES}
        styleId={styleId}
        onStyleChange={(id) => {
          setStyleId(id);
          const s = RF_STYLES.find((x) => x.id === id);
          if (s?.color) setColor(s.color);
        }}
        color={color}
        onColorChange={setColor}
        roomCode={roomCode}
        playLabel="START GAME"
        onPlay={startGame}
      />
    );
  }

  const won = world.roundOver && world.winnerId === deviceId;
  const lost = world.roundOver && world.winnerId !== deviceId;
  const victoryPct = world.fastVictoryPct ?? RF_VICTORY_PCT;

  return (
    <MultiplayerPlayShell inputActive={!world.roundOver} onExit={onExit}>
      <div className="flex min-h-[calc(100dvh-8rem)] w-full max-w-none flex-col bg-slate-950 text-white" data-testid="rf-game-shell">
        {/* Top HUD */}
        <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-3 py-2 text-sm">
          <span className="font-bold text-violet-300">Re:Front</span>
          <span className="text-slate-400">🪙 {Math.floor(me?.gold ?? 0).toLocaleString()}</span>
          <span className="text-slate-400">👥 {Math.floor(me?.population ?? 0).toLocaleString()}</span>
          <span className="text-slate-400">⚔ {Math.floor(me?.troops ?? 0).toLocaleString()}</span>
          <span className="ml-auto rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-200" data-testid="rf-victory-bar">
            🏆 You {me?.territoryPct ?? 0}% · Victory {victoryPct}%
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Objective panel */}
          <aside className="w-full shrink-0 border-b border-slate-800 p-3 lg:w-52 lg:border-b-0 lg:border-r" data-testid="rf-objective-panel">
            <div className="text-xs font-bold uppercase tracking-wide text-violet-300">{objective.title}</div>
            <p className="mt-1 text-sm text-slate-200">{objective.detail}</p>
            {mission.phase === "expand" && (
              <p className="mt-2 text-xs text-emerald-300">💡 Green tiles = easy first expands</p>
            )}
            {mission.phase === "attack-prompt" && nearestEnemy && (
              <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/40 p-2 text-xs">
                <div className="font-bold text-red-300">🚨 ENEMY DETECTED</div>
                <div className="mt-1">{nearestEnemy.nickname}</div>
                <div>Territory {nearestEnemy.territoryPct}% · Troops {Math.floor(nearestEnemy.troops)}</div>
              </div>
            )}
            {mission.phase === "counter" && (
              <div className="mt-3 rounded-lg border border-orange-500/40 bg-orange-950/30 p-2 text-xs text-orange-200">
                🚨 INCOMING ATTACK! DEFEND or counter-attack.
              </div>
            )}
            <div className="mt-4 hidden text-[10px] leading-relaxed text-slate-500 lg:block">
              🖱 Click select · WASD pan · Wheel zoom · ESC clear
            </div>
          </aside>

          {/* Map */}
          <div ref={mapWrapRef} className="relative min-h-[280px] flex-1 lg:min-h-[420px]">
            <canvas
              ref={canvasRef}
              className="h-full w-full touch-none"
              data-mp-play-board
              data-mp-board-input="active"
              onClick={onCanvasClick}
              onWheel={onWheel}
            />

            {world.battle && world.battle.until > nowMs ? (
              <div className="pointer-events-none absolute bottom-4 left-1/2 w-[min(90%,20rem)] -translate-x-1/2 rounded-xl border border-white/20 bg-black/80 p-3 text-center text-sm">
                <div className="font-bold text-rose-300">⚔️ BATTLE</div>
                <div className="mt-1">
                  YOU {world.battle.atkTroops} ⚔️ vs ENEMY {world.battle.defTroops} 🛡️
                </div>
                <div className="mx-auto mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${Math.round(world.battle.progress * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}

            {world.popups.map((p) =>
              p.until > nowMs ? (
                <div
                  key={p.id}
                  className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-bold text-white shadow-lg"
                  style={{ backgroundColor: p.color + "dd" }}
                >
                  {p.text}
                </div>
              ) : null
            )}

            {mission.phase === "how-to-play" ? (
              <HowToPlayModal
                onStart={() => setMission((m) => ({ ...m, phase: "expand" }))}
              />
            ) : null}
          </div>

          {/* Action panel */}
          <aside className="w-full shrink-0 border-t border-slate-800 p-3 lg:w-56 lg:border-l lg:border-t-0" data-testid="rf-action-panel">
            <div className="text-xs text-slate-400">Selected</div>
            <div className="text-sm font-medium">
              {selected
                ? selectedInfo?.nation?.nickname ?? `Neutral · ${terrainLabel(selectedInfo?.terrain ?? 0)}`
                : "Click a tile on the map"}
            </div>
            {selected && selectedInfo?.slot === 0 ? (
              <div className="text-xs text-slate-500">Expand cost: {expandCost} troops</div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canExp || world.roundOver}
                onClick={onExpand}
                className="rounded-lg bg-cyan-600 py-2.5 text-sm font-bold disabled:opacity-40"
                data-testid="rf-expand-btn"
              >
                EXPAND
              </button>
              <button
                type="button"
                disabled={!canAtk || world.roundOver}
                onClick={onAttack}
                className="rounded-lg bg-rose-600 py-2.5 text-sm font-bold disabled:opacity-40"
                data-testid="rf-attack-btn"
              >
                ATTACK
              </button>
              <button
                type="button"
                disabled={!me?.alive || world.roundOver}
                onClick={onDefend}
                className="rounded-lg bg-indigo-700 py-2.5 text-sm font-bold disabled:opacity-40"
                data-testid="rf-defend-btn"
              >
                DEFEND
              </button>
              <button
                type="button"
                disabled={!canCity || world.roundOver}
                onClick={() => onBuild("city")}
                className="rounded-lg bg-amber-700 py-2 text-xs font-bold disabled:opacity-40"
              >
                🏙️ CITY
              </button>
              <button
                type="button"
                disabled={!canDefPost || world.roundOver}
                onClick={() => onBuild("defense")}
                className="col-span-2 rounded-lg bg-slate-700 py-2 text-xs font-bold disabled:opacity-40"
              >
                🛡️ DEFENSE POST
              </button>
            </div>

            {canAtk ? (
              <div className="mt-3">
                <div className="text-xs text-slate-400">Attack power</div>
                <div className="mt-1 flex gap-1">
                  {[0.25, 0.5, 0.75, 1].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAttackPct(p)}
                      className={`flex-1 rounded py-1 text-xs font-semibold ${
                        attackPct === p ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {Math.round(p * 100)}%
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Tutorial: 50% recommended</p>
              </div>
            ) : null}

            <div className="mt-3 text-[10px] text-slate-500 lg:hidden">
              WASD / arrows = pan map · Wheel = zoom
            </div>
          </aside>
        </div>

        {world.roundOver ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-900 p-6 text-center">
              <h2 className="text-2xl font-bold">{won ? "YOU WIN" : lost ? "GAME OVER" : "DRAW"}</h2>
              <p className="mt-2 text-slate-300">
                Territory {me?.territoryPct ?? 0}% · World control target was {victoryPct}%
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={onRematch} className="rounded-lg bg-white py-2 font-bold text-black">
                  REMATCH
                </button>
                <button type="button" onClick={onAnotherGame} className="rounded-lg border border-slate-500 py-2 font-semibold">
                  ANOTHER GAME
                </button>
                <button type="button" onClick={onExit} className="rounded-lg border border-slate-600 py-2 text-slate-300">
                  EXIT
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </MultiplayerPlayShell>
  );
}
