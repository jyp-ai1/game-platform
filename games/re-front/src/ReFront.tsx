"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDeviceId,
  getLastNickname,
  MP_PLAYER_COLORS,
  MultiplayerEntrySelect,
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
  applyRfSyncDelta,
  applyRfSyncState,
  buildRfSyncDelta,
  canAttack,
  canBuild,
  canExpand,
  cellAt,
  createRfSyncTracker,
  createRfWorld,
  findExpandTargets,
  findNearestEnemy,
  localNation,
  nationCenter,
  personalityEmoji,
  personalityLabel,
  reconcileHumans,
  restartRfRound,
  rfQaForceWin,
  RF_SNAPSHOT_TICK_INTERVAL,
  serializeRfState,
  terrainExpandCost,
  tickRfWorld,
  type HumanSeat,
  type RfAction,
  type RfSyncDelta,
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
  showAttackUi,
  showBuildUi,
  showDefendUi,
  type RfMissionState,
} from "./re-front-missions";

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 3.2;
const PLAYER_GREEN = "#22c55e";
const NEUTRAL_LAND = "#eab308";
const ENEMY_RED = "#ef4444";

const RF_STYLES: MpStyleOption[] = [
  { id: "green", label: "Green", emoji: "🟢", color: PLAYER_GREEN },
  { id: "cyan", label: "Cyan", emoji: "🔵", color: MP_PLAYER_COLORS[0]! },
  { id: "pink", label: "Pink", emoji: "🩷", color: MP_PLAYER_COLORS[1]! },
  { id: "gold", label: "Gold", emoji: "🟡", color: MP_PLAYER_COLORS[2]! },
];

type RewardFlash = {
  gold: number;
  pop: number;
  troops: number;
  until: number;
};

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
  if (!room.players.some((p) => p.deviceId === room.hostId)) return true;
  if (room.players.length <= 1) return true;
  const now = Date.now();
  if (lastStateAt <= 0 && now - startedAt > 400) return true;
  if (lastStateAt > 0 && now - lastStateAt > 1200) return true;
  return false;
}

function camOffset(viewW: number, viewH: number, cam: { x: number; y: number }, zoom: number) {
  return {
    ox: viewW / 2 - cam.x * RF_CELL * zoom,
    oy: viewH / 2 - cam.y * RF_CELL * zoom,
  };
}

function computeFitZoom(viewW: number, viewH: number, cellsVisible = 22): number {
  const z = Math.min(viewW, viewH) / (cellsVisible * RF_CELL);
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function screenToCell(
  sx: number,
  sy: number,
  viewW: number,
  viewH: number,
  cam: { x: number; y: number },
  zoom: number
): { cx: number; cy: number } | null {
  const { ox, oy } = camOffset(viewW, viewH, cam, zoom);
  const cx = Math.floor((sx - ox) / (RF_CELL * zoom));
  const cy = Math.floor((sy - oy) / (RF_CELL * zoom));
  if (cx < 0 || cy < 0 || cx >= RF_GRID || cy >= RF_GRID) return null;
  return { cx, cy };
}

function ResourceStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="group relative rounded-lg bg-black/40 px-2 py-1" title={hint}>
      <div className="text-xs font-bold tabular-nums">
        {icon} {value.toLocaleString()}
      </div>
      <div className="hidden text-[9px] text-slate-400 group-hover:block sm:block">{label}</div>
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
  const [styleId, setStyleId] = useState("green");
  const [color, setColor] = useState<string>(PLAYER_GREEN);
  const [selected, setSelected] = useState<{ cx: number; cy: number } | null>(null);
  const [pendingExpand, setPendingExpand] = useState<{ cx: number; cy: number } | null>(null);
  const [cam, setCam] = useState({ x: RF_GRID / 2, y: RF_GRID / 2 });
  const [zoom, setZoom] = useState(1.15);
  const [isHost, setIsHost] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [attackPct, setAttackPct] = useState(0.5);
  const [mission, setMission] = useState<RfMissionState>(() => createMissionState());
  const [viewSize, setViewSize] = useState({ w: 800, h: 520 });
  const [rewardFlash, setRewardFlash] = useState<RewardFlash | null>(null);
  const [pctFlash, setPctFlash] = useState<string | null>(null);
  const prevStatsRef = useRef({ gold: 0, pop: 0, troops: 0, pct: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const touchPanRef = useRef<{ active: boolean; lastX: number; lastY: number; moved: boolean }>({
    active: false,
    lastX: 0,
    lastY: 0,
    moved: false,
  });
  const startedAtRef = useRef(Date.now());
  const lastHostStateAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rfSyncTrackerRef = useRef<ReturnType<typeof createRfSyncTracker> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  const me = localNation(world, deviceId);
  const mySlot = me?.slot ?? 0;
  const objective = missionObjective(mission);
  const expandHints = useMemo(
    () => (mission.phase === "expand" ? findExpandTargets(world, deviceId, 6) : []),
    [world, deviceId, mission.phase]
  );
  const nearestEnemy = useMemo(() => findNearestEnemy(world, deviceId), [world, deviceId]);
  const attackTargets = useMemo(() => {
    if (mission.phase !== "attack-prompt" && mission.phase !== "attack") return [];
    const out: Array<{ cx: number; cy: number }> = [];
    for (let cy = 0; cy < RF_GRID; cy++) {
      for (let cx = 0; cx < RF_GRID; cx++) {
        const slot = world.owner[cy * RF_GRID + cx]!;
        if (!slot) continue;
        const id = world.slotToId[slot];
        const n = id ? world.nations[id] : undefined;
        if (n?.tutorialAggressor && n.alive && canAttack(world, cx, cy, deviceId)) {
          out.push({ cx, cy });
          if (out.length >= 8) return out;
        }
      }
    }
    return out;
  }, [world, deviceId, mission.phase]);
  const botNations = useMemo(
    () => Object.values(world.nations).filter((n) => n.isBot && n.alive),
    [world.nations]
  );
  const victoryPct = world.fastVictoryPct ?? RF_VICTORY_PCT;

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
    const t = window.setTimeout(() => setMission((m) => advanceMissionAfterGrowTimer(m)), 3500);
    return () => clearTimeout(t);
  }, [mission.phase]);

  useEffect(() => {
    if (mission.phase !== "attack-prompt") return;
    for (const n of Object.values(worldRef.current.nations)) {
      if (n.tutorialAggressor && n.alive) {
        const c = nationCenter(worldRef.current, n.id);
        if (c) {
          setCam({ x: c.cx, y: c.cy });
          setZoom((z) => Math.max(z, computeFitZoom(viewSize.w, viewSize.h, 26)));
        }
        break;
      }
    }
  }, [mission.phase, viewSize.h, viewSize.w]);

  useEffect(() => {
    if (world.pendingCounterAttack && !mission.counterSeen) {
      setMission((m) => advanceMissionAfterCounterSeen(m));
    }
  }, [world.pendingCounterAttack, mission.counterSeen]);

  useEffect(() => {
    if (!me) return;
    const prev = prevStatsRef.current;
    if (me.territoryPct > prev.pct + 0.05) {
      setPctFlash(`${prev.pct.toFixed(1)}% → ${me.territoryPct.toFixed(1)}%`);
      window.setTimeout(() => setPctFlash(null), 2200);
    }
    prevStatsRef.current = {
      gold: me.gold,
      pop: me.population,
      troops: me.troops,
      pct: me.territoryPct,
    };
  }, [me?.gold, me?.population, me?.troops, me?.territoryPct, me]);

  const fitViewToPlayer = useCallback(() => {
    const c = nationCenter(worldRef.current, deviceId);
    if (!c) return;
    setCam({ x: c.cx, y: c.cy });
    const el = mapWrapRef.current;
    const vw = el?.clientWidth ?? viewSize.w;
    const vh = el?.clientHeight ?? viewSize.h;
    setZoom(computeFitZoom(vw, vh, 22));
  }, [deviceId, viewSize.h, viewSize.w]);

  const centerOnPlayer = useCallback(() => {
    fitViewToPlayer();
  }, [fitViewToPlayer]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const w = worldRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w: viewW, h: viewH } = viewSize;
    canvas.width = viewW;
    canvas.height = viewH;

    const { ox, oy } = camOffset(viewW, viewH, cam, zoom);
    const cellPx = RF_CELL * zoom;
    const pulse = 0.35 + Math.sin(nowMs / 280) * 0.35;
    const hintSet = new Set(expandHints.map((h) => `${h.cx},${h.cy}`));
    const attackSet = new Set(attackTargets.map((h) => `${h.cx},${h.cy}`));

    ctx.fillStyle = "#060a12";
    ctx.fillRect(0, 0, viewW, viewH);

    for (let cy = 0; cy < RF_GRID; cy++) {
      for (let cx = 0; cx < RF_GRID; cx++) {
        const i = cy * RF_GRID + cx;
        const slot = w.owner[i]!;
        const sx = ox + cx * cellPx;
        const sy = oy + cy * cellPx;
        const sz = cellPx + 0.5;

        if (slot === 0) {
          ctx.fillStyle = NEUTRAL_LAND;
        } else if (slot === mySlot) {
          ctx.fillStyle = me?.color ?? PLAYER_GREEN;
        } else {
          const id = w.slotToId[slot];
          const n = id ? w.nations[id] : undefined;
          ctx.fillStyle = n?.tutorialAggressor ? ENEMY_RED : (n?.color ?? "#64748b");
          if (n && !n.alive) ctx.fillStyle = "#334155";
        }
        ctx.fillRect(sx, sy, sz, sz);

        if (slot === mySlot) {
          ctx.strokeStyle = "rgba(21, 128, 61, 0.85)";
          ctx.lineWidth = Math.max(1, zoom * 0.6);
          ctx.strokeRect(sx + 0.5, sy + 0.5, sz - 1, sz - 1);
        } else if (slot !== 0) {
          ctx.strokeStyle = "rgba(127, 29, 29, 0.7)";
          ctx.lineWidth = Math.max(1, zoom * 0.5);
          ctx.strokeRect(sx + 0.5, sy + 0.5, sz - 1, sz - 1);
        } else {
          ctx.strokeStyle = "rgba(234, 179, 8, 0.35)";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 0.5, sy + 0.5, sz - 1, sz - 1);
        }

        const building = w.buildings[i];
        if (building === 1 && cellPx >= 6) {
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(sx + sz * 0.35, sy + sz * 0.35, sz * 0.3, sz * 0.3);
        } else if (building === 2 && cellPx >= 6) {
          ctx.fillStyle = "#94a3b8";
          ctx.fillRect(sx + sz * 0.3, sy + sz * 0.3, sz * 0.4, sz * 0.4);
        }

        if (slot === 0 && hintSet.has(`${cx},${cy}`)) {
          ctx.fillStyle = `rgba(74, 222, 128, ${pulse})`;
          ctx.fillRect(sx, sy, sz, sz);
          ctx.strokeStyle = "#4ade80";
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 1, sy + 1, sz - 2, sz - 2);
          if (cellPx >= 10) {
            ctx.font = `${Math.floor(cellPx * 0.7)}px sans-serif`;
            ctx.fillStyle = "#052e16";
            ctx.fillText("⭐", sx + sz * 0.15, sy + sz * 0.85);
          }
        }

        if (attackSet.has(`${cx},${cy}`)) {
          ctx.fillStyle = `rgba(248, 113, 113, ${pulse * 0.65})`;
          ctx.fillRect(sx, sy, sz, sz);
          ctx.strokeStyle = "#fca5a5";
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 1, sy + 1, sz - 2, sz - 2);
          if (cellPx >= 10) {
            ctx.font = `${Math.floor(cellPx * 0.65)}px sans-serif`;
            ctx.fillStyle = "#fff";
            ctx.fillText("⚔", sx + sz * 0.2, sy + sz * 0.82);
          }
        }
      }
    }

    for (const f of w.flashes) {
      if (f.until <= Date.now()) continue;
      const sx = ox + f.cx * cellPx;
      const sy = oy + f.cy * cellPx;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, cellPx, cellPx);
    }

    if (selected) {
      const sx = ox + selected.cx * cellPx;
      const sy = oy + selected.cy * cellPx;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 1, sy - 1, cellPx + 2, cellPx + 2);
    }
  }, [attackTargets, cam, expandHints, me?.color, mySlot, nowMs, selected, viewSize, zoom]);

  useEffect(() => {
    draw();
  }, [world, draw, nowMs]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 80);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!started || world.roundOver) return;
    const pan = () => {
      const speed = 0.4 / zoom;
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
      if (e.key === "Escape") {
        setSelected(null);
        setPendingExpand(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [started]);

  const recordReward = useCallback(() => {
    const n = localNation(worldRef.current, deviceId);
    const prev = prevStatsRef.current;
    if (!n) return;
    setRewardFlash({
      gold: Math.max(0, Math.floor(n.gold - prev.gold)),
      pop: Math.max(0, Math.floor(n.population - prev.pop)),
      troops: Math.max(0, Math.floor(n.troops - prev.troops)),
      until: Date.now() + 2500,
    });
  }, [deviceId]);

  const broadcastRfSync = useCallback(
    (w: RfWorld, forceSnapshot = false) => {
      if (forceSnapshot || w.tick % RF_SNAPSHOT_TICK_INTERVAL === 0) {
        send(roomCode, "rf:snapshot", serializeRfState(w));
        rfSyncTrackerRef.current = createRfSyncTracker(w);
        return;
      }
      if (!rfSyncTrackerRef.current) rfSyncTrackerRef.current = createRfSyncTracker(w);
      send(roomCode, "rf:delta", buildRfSyncDelta(rfSyncTrackerRef.current, w));
    },
    [roomCode]
  );

  const dispatchAction = useCallback(
    (action: RfAction) => {
      const before = localNation(worldRef.current, deviceId);
      if (before) {
        prevStatsRef.current = {
          gold: before.gold,
          pop: before.population,
          troops: before.troops,
          pct: before.territoryPct,
        };
      }
      const w = snapWorld(worldRef.current);
      const host = isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current);
      if (host) {
        const ok = applyRfAction(w, action);
        if (ok) {
          tickRfWorld(w);
          worldRef.current = w;
          setWorld(w);
          broadcastRfSync(w, true);
          lastHostStateAtRef.current = Date.now();
          recordReward();
        }
        return ok;
      }
      send(roomCode, "rf:action", action);
      return true;
    },
    [broadcastRfSync, deviceId, recordReward, roomCode]
  );

  const onExpand = useCallback(() => {
    const cell = pendingExpand ?? selected;
    if (!cell || !me?.alive) return;
    const ok = dispatchAction({ type: "expand", cx: cell.cx, cy: cell.cy, nationId: deviceId });
    if (ok) {
      setMission((m) => advanceMissionAfterExpand(m));
      setPendingExpand(null);
      setSelected(null);
    }
  }, [deviceId, dispatchAction, me?.alive, pendingExpand, selected]);

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
      if (touchPanRef.current.moved) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const cell = screenToCell(e.clientX - rect.left, e.clientY - rect.top, viewSize.w, viewSize.h, cam, zoom);
      if (!cell) return;
      setSelected(cell);
      if (mission.phase === "expand" && canExpand(worldRef.current, cell.cx, cell.cy, deviceId)) {
        setPendingExpand(cell);
      } else {
        setPendingExpand(null);
      }
    },
    [cam, deviceId, mission.phase, viewSize.h, viewSize.w, zoom]
  );

  const onCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    touchPanRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const t = touchPanRef.current;
      if (!t.active) return;
      const dxPx = e.clientX - t.lastX;
      const dyPx = e.clientY - t.lastY;
      if (Math.abs(dxPx) + Math.abs(dyPx) > 6) t.moved = true;
      const dx = dxPx / (RF_CELL * zoom);
      const dy = dyPx / (RF_CELL * zoom);
      if (dx || dy) setCam((c) => ({ x: c.x - dx, y: c.y - dy }));
      touchPanRef.current.lastX = e.clientX;
      touchPanRef.current.lastY = e.clientY;
    },
    [zoom]
  );

  const onCanvasPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    touchPanRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.001)));
  }, []);

  const startGame = useCallback(async () => {
    try {
      await ensureRoom(roomCode);
      await joinRoomAsync(roomCode, { nickname, gameSlug: "re-front", maxPlayers: RF_MAX_PLAYERS });
    } catch {
      if (!getRoom(roomCode)) {
        createRoom({ gameSlug: "re-front", maxPlayers: RF_MAX_PLAYERS, code: roomCode, matchMode: "private" });
      }
      joinRoom(roomCode, { nickname, gameSlug: "re-front", maxPlayers: RF_MAX_PLAYERS });
    }

    const humans = collectHumans(roomCode, deviceId, nickname, color);
    const w = createRfWorld(deviceId, nickname, humans);
    w.nations[deviceId]!.color = color;
    reconcileHumans(w, humans);
    worldRef.current = w;
    setWorld(w);
    setStarted(true);
    setMission(createMissionState());
    startedAtRef.current = Date.now();
    window.setTimeout(() => fitViewToPlayer(), 80);
    window.setTimeout(() => fitViewToPlayer(), 400);

    const host = isSimHost(roomCode, deviceId, 0, startedAtRef.current);
    setIsHost(host);
    if (host) broadcastRfSync(w, true);

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
        broadcastRfSync(local, true);
        lastHostStateAtRef.current = Date.now();
        return;
      }
      if (last === "rf:action" && gs["rf:action"] && amHost) {
        const local = snapWorld(worldRef.current);
        applyRfAction(local, gs["rf:action"] as RfAction);
        tickRfWorld(local);
        worldRef.current = local;
        setWorld(local);
        broadcastRfSync(local, true);
        lastHostStateAtRef.current = Date.now();
        return;
      }
      if (last === "rf:delta" && gs["rf:delta"] && !amHost) {
        lastHostStateAtRef.current = Date.now();
        const local = snapWorld(worldRef.current);
        applyRfSyncDelta(local, gs["rf:delta"] as RfSyncDelta, { rejectStaleTick: true });
        worldRef.current = local;
        setWorld(local);
        return;
      }
      if (last === "rf:snapshot" && gs["rf:snapshot"] && !amHost) {
        lastHostStateAtRef.current = Date.now();
        const local = snapWorld(worldRef.current);
        applyRfSyncState(local, gs["rf:snapshot"] as RfSyncState, { rejectStaleTick: true });
        worldRef.current = local;
        setWorld(local);
        return;
      }
      if (last === "state" && gs.state && !amHost) {
        lastHostStateAtRef.current = Date.now();
        const local = snapWorld(worldRef.current);
        applyRfSyncState(local, gs.state as RfSyncState, { rejectStaleTick: true });
        worldRef.current = local;
        setWorld(local);
      }
    });

    tickRef.current = setInterval(() => {
      if (!isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current)) return;
      const local = snapWorld(worldRef.current);
      if (local.roundOver) return;
      tickRfWorld(local);
      worldRef.current = local;
      setWorld(local);
      broadcastRfSync(local);
      lastHostStateAtRef.current = Date.now();
    }, RF_TICK_MS);
  }, [broadcastRfSync, fitViewToPlayer, color, deviceId, nickname, roomCode]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      unsubRef.current?.();
      leaveRoom(roomCode);
    };
  }, [roomCode]);

  const onRematch = useCallback(() => {
    send(roomCode, "rf:rematch", { at: Date.now() });
    if (isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current)) {
      const humans = collectHumans(roomCode, deviceId, nickname, color);
      const w = snapWorld(worldRef.current);
      restartRfRound(w, deviceId, nickname, humans);
      worldRef.current = w;
      setWorld(w);
      setMission(createMissionState());
      broadcastRfSync(w, true);
    }
    setSelected(null);
    setPendingExpand(null);
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
      mission,
      me: localNation(worldRef.current, deviceId),
    });
  }, [deviceId, mission]);

  const selectedInfo = selected ? cellAt(world, selected.cx, selected.cy) : null;
  const canExp = (pendingExpand ?? selected) && me ? canExpand(world, (pendingExpand ?? selected)!.cx, (pendingExpand ?? selected)!.cy, deviceId) : false;
  const canAtk = selected && me ? canAttack(world, selected.cx, selected.cy, deviceId) : false;
  const expandCell = pendingExpand ?? selected;
  const expandCost = expandCell ? terrainExpandCost(world, expandCell.cx, expandCell.cy, deviceId) : RF_EXPAND_COST;

  const selectionHint = (() => {
    if (!selected) return "맵에서 타일을 클릭하세요";
    if (selectedInfo?.slot === mySlot) return "🟢 내 영토입니다";
    if (selectedInfo?.slot === 0) return "🟡 빈 땅 — EXPAND로 차지하세요";
    if (selectedInfo?.nation?.tutorialAggressor) return "🔴 RED KINGDOM — Mission 2에서 공격";
    if (selectedInfo?.nation) return `🔴 ${selectedInfo.nation.nickname} (적)`;
    return "선택됨";
  })();

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
  const empirePct = Math.min(100, ((me?.territoryPct ?? 0) / victoryPct) * 100);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#060a12] text-white" data-testid="rf-game-shell">
      <header className="shrink-0 border-b border-white/10 px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onExit} className="text-[10px] text-slate-400 hover:text-white sm:text-xs">
            ← Exit
          </button>
          <span className="text-sm font-bold text-emerald-300 sm:text-base">🌎 Re:Front</span>
          <button type="button" onClick={fitViewToPlayer} className="text-[10px] text-slate-400 hover:text-emerald-300 sm:text-xs" title="내 영토로 이동">
            📍
          </button>
        </div>
        <div className="mt-1 flex flex-wrap gap-1 text-[10px] sm:mt-2 sm:gap-2 sm:text-xs">
          <ResourceStat icon="🪙" label="Gold" value={Math.floor(me?.gold ?? 0)} hint="Territory → Gold" />
          <ResourceStat icon="👥" label="Pop" value={Math.floor(me?.population ?? 0)} hint="Territory → Population" />
          <ResourceStat icon="⚔" label="Troops" value={Math.floor(me?.troops ?? 0)} hint="Pop → Troops → Battle" />
        </div>
        <div className="mt-1" data-testid="rf-empire-bar">
          <div className="flex justify-between text-[9px] text-slate-400 sm:text-[10px]">
            <span>Territory {me?.territoryPct?.toFixed(1) ?? 0}% / {victoryPct}%</span>
            <span>{Math.max(0, victoryPct - (me?.territoryPct ?? 0)).toFixed(1)}% to win</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800 sm:mt-1 sm:h-2">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${empirePct}%` }} />
          </div>
          {pctFlash ? <p className="mt-0.5 text-[10px] font-bold text-emerald-300 sm:text-xs">🌎 +1 TERRITORY · {pctFlash}</p> : null}
          {rewardFlash && rewardFlash.until > nowMs ? (
            <p className="mt-0.5 text-[9px] text-amber-200 sm:text-[10px]">
              +{rewardFlash.gold} Gold · +{rewardFlash.pop} Pop · +{rewardFlash.troops} Troops
            </p>
          ) : null}
        </div>
        {botNations.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1 text-[9px] sm:text-[10px]" data-testid="rf-ai-nations">
            {botNations.map((b) => (
              <span
                key={b.id}
                className="rounded-full border border-white/10 bg-black/40 px-1.5 py-0.5"
                title={personalityLabel(b.personality ?? "expander")}
              >
                {personalityEmoji(b.personality ?? "expander")} {b.nickname}{" "}
                <span className="text-slate-400">({personalityLabel(b.personality ?? "expander")})</span>
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <section
        className="hidden shrink-0 border-b border-white/10 bg-violet-950/30 px-3 py-1.5 text-[10px] leading-relaxed sm:block sm:py-2 sm:text-xs"
        data-testid="rf-inline-tutorial"
      >
        <p className="font-semibold text-violet-100">{objective.stepLabel}</p>
        <p className="mt-0.5 text-slate-300">{objective.detail}</p>
      </section>

      <div ref={mapWrapRef} className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          data-mp-play-board
          data-mp-board-input="active"
          onClick={onCanvasClick}
          onWheel={onWheel}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
        />
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[9px] text-slate-200 sm:text-[10px]">
          🟢 Mine · 🟡 Expand · 🔴 Enemy · ⭐ 추천 · Drag 이동
        </div>
        {world.battle && world.battle.until > nowMs ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-[min(90%,18rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-rose-400/50 bg-black/85 p-4 text-center text-sm shadow-xl">
            <div className="text-lg font-bold text-rose-300">⚔️ BATTLE</div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <div className="text-emerald-300">🟢 YOU<br />{world.battle.atkTroops}</div>
              <div className="text-2xl">⚔️</div>
              <div className="text-red-400">🔴 ENEMY<br />{world.battle.defTroops}</div>
            </div>
            <div className="mx-auto mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
              <div className="h-full bg-rose-500" style={{ width: `${Math.round(world.battle.progress * 100)}%` }} />
            </div>
          </div>
        ) : null}
        {world.popups.map((p) =>
          p.until > nowMs ? (
            <div key={p.id} className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm font-bold shadow-lg" style={{ color: p.color }}>
              {p.text}
            </div>
          ) : null
        )}
      </div>

      <footer className="shrink-0 border-t border-white/10 bg-slate-950/95 p-2 sm:p-3" data-testid="rf-action-panel">
        <div
          className="mb-2 rounded-xl border border-amber-400/40 bg-amber-950/30 px-3 py-2 text-center"
          data-testid="rf-next-action"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80 sm:text-xs">{objective.stepLabel}</p>
          <p className="mt-0.5 text-sm font-bold text-amber-100 sm:text-base">{objective.nextAction}</p>
          <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">{objective.title} — {objective.cta}</p>
        </div>
        {pendingExpand && mission.phase === "expand" ? (
          <div className="mb-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-center" data-testid="rf-expand-confirm">
            <div className="font-bold text-emerald-200">EXPAND</div>
            <p className="mt-1 text-sm text-slate-200">이 땅을 차지하시겠습니까?</p>
            <p className="mt-1 text-xs text-amber-200">보상: Territory +1 · Gold +120 · Pop +8</p>
            <p className="text-[10px] text-slate-400">비용: Troops {expandCost}</p>
            <button type="button" disabled={!canExp} onClick={onExpand} className="mt-2 w-full rounded-xl bg-emerald-600 py-3 text-base font-bold disabled:opacity-40" data-testid="rf-expand-btn">
              🟢 EXPAND
            </button>
          </div>
        ) : (
          <>
            <p className="text-[10px] text-slate-400 sm:text-xs">{selectionHint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(mission.phase === "expand" || mission.phase === "grow" || mission.phase === "free") && (
                <button type="button" disabled={!canExp || world.roundOver} onClick={onExpand} className="min-h-12 flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-base font-bold disabled:opacity-40" data-testid="rf-expand-btn">
                  🟢 EXPAND
                </button>
              )}
              {showAttackUi(mission.phase) && (
                <button type="button" disabled={!canAtk || world.roundOver} onClick={onAttack} className="min-h-12 flex-1 rounded-xl bg-rose-600 px-4 py-3 text-base font-bold disabled:opacity-40" data-testid="rf-attack-btn">
                  ⚔️ ATTACK
                </button>
              )}
              {showDefendUi(mission.phase) && (
                <button type="button" disabled={!me?.alive || world.roundOver} onClick={onDefend} className="min-h-12 flex-1 rounded-xl bg-indigo-700 px-4 py-3 text-base font-bold disabled:opacity-40" data-testid="rf-defend-btn">
                  🛡️ DEFEND
                </button>
              )}
            </div>
            {showAttackUi(mission.phase) && canAtk ? (
              <div className="mt-2">
                <div className="text-[10px] text-slate-400">Attack power (50% 추천)</div>
                <div className="mt-1 flex gap-1">
                  {[0.25, 0.5, 0.75, 1].map((p) => (
                    <button key={p} type="button" onClick={() => setAttackPct(p)} className={`flex-1 rounded py-1.5 text-xs font-semibold ${attackPct === p ? "bg-rose-500" : "bg-slate-800"}`}>
                      {Math.round(p * 100)}%
                    </button>
                  ))}
                </div>
                {nearestEnemy ? (
                  <p className="mt-1 text-[10px] text-slate-400">
                    You ⚔{Math.floor(me?.troops ?? 0)} vs {nearestEnemy.nickname} ⚔{Math.floor(nearestEnemy.troops)}
                  </p>
                ) : null}
              </div>
            ) : null}
            {showBuildUi(mission.phase) && selected && selectedInfo?.slot === mySlot ? (
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={!canBuild(world, selected.cx, selected.cy, deviceId, "city")} onClick={() => onBuild("city")} className="flex-1 rounded-lg bg-amber-800 py-2 text-xs font-bold disabled:opacity-40">
                  🏙️ CITY
                </button>
                <button type="button" disabled={!canBuild(world, selected.cx, selected.cy, deviceId, "defense")} onClick={() => onBuild("defense")} className="flex-1 rounded-lg bg-slate-700 py-2 text-xs font-bold disabled:opacity-40">
                  🛡️ POST
                </button>
              </div>
            ) : null}
          </>
        )}
        {mission.phase === "counter" && world.pendingCounterAttack ? (
          <p className="mt-2 text-center text-sm font-bold text-red-300">🔴 적의 반격! DEFEND 또는 ATTACK</p>
        ) : null}
      </footer>

      {world.roundOver ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-900 p-6 text-center">
            <h2 className="text-2xl font-bold">
              {won ? "👑 EMPIRE COMPLETE" : lost ? "💀 YOUR EMPIRE HAS FALLEN" : "DRAW"}
            </h2>
            <p className="mt-2 text-lg font-semibold text-emerald-300">{won ? "YOU WIN" : lost ? "DEFEAT" : "STALEMATE"}</p>
            <p className="mt-2 text-slate-300">Territory {me?.territoryPct?.toFixed(1) ?? 0}% / {victoryPct}%</p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={onRematch} className="rounded-lg bg-white py-2 font-bold text-black" data-testid="rf-rematch-btn">
                RETRY
              </button>
              <button type="button" onClick={onAnotherGame} className="rounded-lg border border-slate-500 py-2">
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
  );
}
