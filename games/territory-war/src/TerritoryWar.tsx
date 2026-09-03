"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDeviceId,
  getLastNickname,
  isMpBoardInputActive,
  isMpGameKey,
  MobileControlPad,
  MP_PLAYER_COLORS,
  MultiplayerDeathOverlay,
  MultiplayerEntrySelect,
  MultiplayerPlayShell,
  MultiplayerSideRankHud,
  MultiplayerYouBar,
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
  TW_ABILITY_READY,
  TW_CELL,
  TW_GRID,
  TW_MAX_PLAYERS,
  TW_TICK_MS,
  TW_TRAIL_DANGER_CELLS,
  TW_WORLD,
  applyTwInput,
  applyTwSyncState,
  cameraFocus,
  createTerritoryWorld,
  playerVisualRadius,
  reconcileHumans,
  remainingTwSec,
  restartTwRound,
  serializeTwState,
  tickTerritoryWorld,
  type HumanSeat,
  type TerritoryWorld,
  type TwInput,
  type TwPlayer,
  type TwSyncState,
} from "./territory-war-engine";

const VIEW = 720;
const SLOT_COLORS: Record<number, string> = {};

function resolveRoomCode(): string {
  if (typeof window === "undefined") return "TW-LOBBY";
  const q = new URLSearchParams(window.location.search).get("room");
  return (q && q.trim()) || "TW-LOBBY";
}

const TW_STYLES: MpStyleOption[] = [
  { id: "cyan", label: "Cyan", emoji: "🔵", color: MP_PLAYER_COLORS[0] },
  { id: "pink", label: "Pink", emoji: "🩷", color: MP_PLAYER_COLORS[1] },
  { id: "gold", label: "Gold", emoji: "🟡", color: MP_PLAYER_COLORS[2] },
  { id: "green", label: "Green", emoji: "🟢", color: MP_PLAYER_COLORS[3] },
];

function snapWorld(w: TerritoryWorld): TerritoryWorld {
  return {
    tick: w.tick,
    roundStartedAt: w.roundStartedAt,
    roundOver: w.roundOver,
    winnerId: w.winnerId,
    owner: new Uint8Array(w.owner),
    trail: new Uint8Array(w.trail),
    players: Object.fromEntries(
      Object.entries(w.players).map(([k, p]) => [
        k,
        { ...p, trail: p.trail.slice(), trailPoints: p.trailPoints.slice() },
      ])
    ),
    items: w.items.map((i) => ({ ...i })),
    rankings: w.rankings.slice(),
    idToSlot: { ...w.idToSlot },
    slotToId: { ...w.slotToId },
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
  return list.slice(0, TW_MAX_PLAYERS);
}

const BEST_KEY = "play29:territory-war-best";

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
}

function saveBest(pct: number): number {
  const prev = loadBest();
  if (pct > prev) {
    localStorage.setItem(BEST_KEY, String(pct));
    return pct;
  }
  return prev;
}

type Popup = { id: number; sx: number; sy: number; text: string; color: string; until: number; scale?: number };

const ONBOARD_HINTS = [
  { untilTick: 120, text: "Move with WASD / touch pad" },
  { untilTick: 240, text: "Leave your territory → draw a trail → return to expand" },
  { untilTick: 420, text: "Cut enemy trails · avoid crossing your own" },
  { untilTick: 600, text: "Expand · compete · don't die" },
];

function resolveTwSimulationHost(
  deviceId: string,
  code: string,
  opts: { lastHostStateAt: number; startedAt: number; now?: number }
): boolean {
  const now = opts.now ?? Date.now();
  const room = sync(code) ?? getRoom(code);
  if (!room) return true;
  if (room.hostId === deviceId) return true;
  const hostPresent = room.players.some((p) => p.deviceId === room.hostId);
  if (!hostPresent) return true;
  if (room.players.length <= 1) return true;
  if (opts.lastHostStateAt <= 0 && now - opts.startedAt > 400) return true;
  if (opts.lastHostStateAt > 0 && now - opts.lastHostStateAt > 1200) return true;
  return false;
}

function slotColor(world: TerritoryWorld, slot: number): string {
  const id = world.slotToId[slot];
  const p = id ? world.players[id] : undefined;
  return p?.color ?? SLOT_COLORS[slot] ?? "#64748b";
}

function drawTrailCells(
  ctx: CanvasRenderingContext2D,
  world: TerritoryWorld,
  cam: { x: number; y: number },
  deviceId: string
): void {
  const half = VIEW / 2;
  const minCx = Math.max(0, Math.floor((cam.x - half) / TW_CELL));
  const maxCx = Math.min(TW_GRID - 1, Math.ceil((cam.x + half) / TW_CELL));
  const minCy = Math.max(0, Math.floor((cam.y - half) / TW_CELL));
  const maxCy = Math.min(TW_GRID - 1, Math.ceil((cam.y + half) / TW_CELL));

  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const i = cy * TW_GRID + cx;
      const slot = world.trail[i]!;
      if (!slot) continue;
      const p = world.players[world.slotToId[slot] ?? ""];
      if (!p?.alive) continue;
      const isSelf = p.id === deviceId;
      const sx = cx * TW_CELL - cam.x + half;
      const sy = cy * TW_CELL - cam.y + half;
      ctx.fillStyle = isSelf ? p.color + "55" : p.color + "77";
      ctx.fillRect(sx, sy, TW_CELL + 1, TW_CELL + 1);
    }
  }
}

function drawTrailLines(
  ctx: CanvasRenderingContext2D,
  world: TerritoryWorld,
  cam: { x: number; y: number },
  deviceId: string
): void {
  const half = VIEW / 2;
  for (const p of Object.values(world.players)) {
    if (!p.alive || p.trailPoints.length < 2) continue;
    const isSelf = p.id === deviceId;
    const isEnemy = !isSelf;
    const danger = isSelf && p.trail.length >= TW_TRAIL_DANGER_CELLS;
    ctx.beginPath();
    for (let i = 0; i < p.trailPoints.length; i++) {
      const pt = p.trailPoints[i]!;
      const sx = pt.x - cam.x + half;
      const sy = pt.y - cam.y + half;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = danger ? "#f87171ee" : isSelf ? p.color + "ee" : "#fca5a5ee";
    ctx.lineWidth = danger ? 6 : isSelf ? 4 : 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = danger ? "#ef4444" : isEnemy ? "#ef4444" : p.color;
    ctx.shadowBlur = isSelf ? (danger ? 16 : 4) : 18;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawEdgeIndicators(
  ctx: CanvasRenderingContext2D,
  world: TerritoryWorld,
  cam: { x: number; y: number },
  deviceId: string
): void {
  const half = VIEW / 2;
  const margin = 28;
  for (const p of Object.values(world.players)) {
    if (!p.alive || p.id === deviceId) continue;
    const sx = p.x - cam.x + half;
    const sy = p.y - cam.y + half;
    if (sx >= margin && sx <= VIEW - margin && sy >= margin && sy <= VIEW - margin) continue;
    const dx = sx - VIEW / 2;
    const dy = sy - VIEW / 2;
    const ang = Math.atan2(dy, dx);
    const cx = VIEW / 2 + Math.cos(ang) * (VIEW / 2 - margin);
    const cy = VIEW / 2 + Math.sin(ang) * (VIEW / 2 - margin);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = p.botRole === "hunter" ? "#ef4444" : p.color;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.nickname.slice(0, 6).toUpperCase(), 0, -10);
    ctx.restore();
  }
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: TerritoryWorld,
  cam: { x: number; y: number },
  deviceId: string,
  now = Date.now()
): void {
  const half = VIEW / 2;
  const minCx = Math.max(0, Math.floor((cam.x - half) / TW_CELL));
  const maxCx = Math.min(TW_GRID - 1, Math.ceil((cam.x + half) / TW_CELL));
  const minCy = Math.max(0, Math.floor((cam.y - half) / TW_CELL));
  const maxCy = Math.min(TW_GRID - 1, Math.ceil((cam.y + half) / TW_CELL));
  const me = world.players[deviceId];
  const claimPulse =
    me?.claimFlashUntil && now < me.claimFlashUntil
      ? 0.35 + 0.25 * Math.sin((now / 80) * Math.PI * 2)
      : 0;

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, VIEW, VIEW);

  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const i = cy * TW_GRID + cx;
      const owner = world.owner[i]!;
      const sx = cx * TW_CELL - cam.x + half;
      const sy = cy * TW_CELL - cam.y + half;
      if (owner > 0) {
        const isSelf = owner === me?.slot;
        const alpha = isSelf ? (claimPulse > 0 ? "aa" : "77") : "44";
        ctx.fillStyle = slotColor(world, owner) + alpha;
        ctx.fillRect(sx, sy, TW_CELL + 1, TW_CELL + 1);
        if (isSelf && claimPulse > 0) {
          ctx.fillStyle = `rgba(251, 191, 36, ${claimPulse})`;
          ctx.fillRect(sx, sy, TW_CELL + 1, TW_CELL + 1);
        }
      }
    }
  }

  drawTrailCells(ctx, world, cam, deviceId);
  drawTrailLines(ctx, world, cam, deviceId);

  for (const p of Object.values(world.players)) {
    if (!p.alive) continue;
    const sx = p.x - cam.x + half;
    const sy = p.y - cam.y + half;
    const r = playerVisualRadius(p);
    const isSelf = p.id === deviceId;
    const ang = Math.atan2(p.vy || p.aimDy, p.vx || p.aimDx);

    ctx.beginPath();
    ctx.arc(sx, sy, r + (isSelf ? 3 : 0), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = isSelf ? 3 : p.isBot && p.botRole === "hunter" ? 3 : 2;
    ctx.strokeStyle = isSelf ? "#fff" : p.botRole === "hunter" ? "#ef4444" : "#1e293b";
    ctx.stroke();

    if (isSelf) {
      ctx.beginPath();
      ctx.arc(sx, sy, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff44";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang) * (r + 6), sy + Math.sin(ang) * (r + 6));
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (p.isBot) {
      const isHunter = p.botRole === "hunter";
      if (isHunter) {
        ctx.beginPath();
        ctx.arc(sx, sy, r + 10, 0, Math.PI * 2);
        ctx.strokeStyle = "#ef444488";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = isHunter ? "#fca5a5" : "#fbbf24";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(isHunter ? "HUNTER" : (p.botRole?.toUpperCase() ?? "BOT"), sx, sy + r + 12);
    }

    ctx.fillStyle = isSelf ? "#fff" : "#e2e8f0";
    ctx.font = isSelf ? "bold 11px sans-serif" : "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isSelf ? "YOU" : p.nickname.slice(0, 10), sx, sy - r - 8);
  }

  drawEdgeIndicators(ctx, world, cam, deviceId);
}

export function TerritoryWarGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "You", []);
  const roomCode = useMemo(() => resolveRoomCode(), []);

  const [world, setWorld] = useState<TerritoryWorld>(() =>
    createTerritoryWorld(deviceId, nickname)
  );
  const worldRef = useRef(world);
  worldRef.current = world;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [styleId, setStyleId] = useState(TW_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const [isHost, setIsHost] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [popups, setPopups] = useState<Popup[]>([]);
  const [bestTerritory, setBestTerritory] = useState(loadBest);
  const [banner, setBanner] = useState<string | null>(null);
  const [koFlash, setKoFlash] = useState(false);
  const prevAliveRef = useRef(true);

  const roomRef = useRef(roomCode);
  roomRef.current = roomCode;
  const isHostRef = useRef(false);
  const forceSimHostRef = useRef(false);
  const pendingInputs = useRef<TwInput[]>([]);
  const lastInputsRef = useRef<Record<string, TwInput>>({});
  const lastGuestInputAt = useRef<Record<string, number>>({});
  const lastHostStateAt = useRef(0);
  const steerRef = useRef({ dx: 0, dy: 0 });
  const keysHeldRef = useRef({ up: false, down: false, left: false, right: false });
  const popupIdRef = useRef(0);
  const prevTickRef = useRef(0);
  const prevRankRef = useRef(99);
  const rematchRequestedRef = useRef(false);
  const rafRef = useRef(0);
  const gameStartedAtRef = useRef(0);

  const me = world.players[deviceId];
  const alive = !!me?.alive;
  const score = Math.round(me?.score ?? 0);
  const territoryPct = me?.territoryPct ?? 0;
  const knockouts = me?.knockouts ?? 0;
  const rankIdx = world.rankings.findIndex((r) => r.id === deviceId);
  const rank = rankIdx >= 0 ? rankIdx + 1 : 0;
  const timeLeft = remainingTwSec(world, nowTick);
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const cam = cameraFocus(me);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await ensureRoom(roomCode);
        let room = await joinRoomAsync(roomCode, {
          nickname,
          gameSlug: "territory-war",
          maxPlayers: 4,
        });
        if (!room && !getRoom(roomCode)) {
          createRoom({
            gameSlug: "territory-war",
            maxPlayers: 4,
            code: roomCode,
            matchMode: "private",
          });
          room = joinRoom(roomCode, { nickname, gameSlug: "territory-war", maxPlayers: 4 });
        }
        if (!mounted) return;
      } catch {
        try {
          if (!getRoom(roomCode)) {
            createRoom({
              gameSlug: "territory-war",
              maxPlayers: 4,
              code: roomCode,
              matchMode: "private",
            });
          }
          joinRoom(roomCode, { nickname, gameSlug: "territory-war", maxPlayers: 4 });
        } catch {
          /* solo */
        }
      }
    })();
    return () => {
      mounted = false;
      try {
        leaveRoom(roomCode);
      } catch {
        /* ignore */
      }
    };
  }, [roomCode, nickname]);

  const pushInput = useCallback(
    (partial: Partial<Omit<TwInput, "deviceId" | "at">>) => {
      const code = roomRef.current;
      const payload: TwInput = {
        deviceId,
        dx: partial.dx ?? steerRef.current.dx,
        dy: partial.dy ?? steerRef.current.dy,
        boost: partial.boost,
        ability: partial.ability,
        at: Date.now(),
      };
      if (isHostRef.current || forceSimHostRef.current) {
        pendingInputs.current.push(payload);
      } else {
        send(code, `input:${deviceId}`, payload);
      }
      lastInputsRef.current[deviceId] = payload;
    },
    [deviceId]
  );

  const applySteer = useCallback(
    (dx: number, dy: number) => {
      steerRef.current = { dx, dy };
      pushInput({ dx, dy });
    },
    [pushInput]
  );

  const syncSteerFromKeys = useCallback(() => {
    const k = keysHeldRef.current;
    let dx = 0;
    let dy = 0;
    if (k.up) dy -= 1;
    if (k.down) dy += 1;
    if (k.left) dx -= 1;
    if (k.right) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) applySteer(dx / len, dy / len);
    else applySteer(0, 0);
  }, [applySteer]);

  const refreshKeyboardSteer = useCallback(() => {
    const k = keysHeldRef.current;
    if (!k.up && !k.down && !k.left && !k.right) return;
    syncSteerFromKeys();
  }, [syncSteerFromKeys]);

  useEffect(() => {
    if (!started || !alive || world.roundOver) return;

    const setKey = (code: string, down: boolean) => {
      if (code === "ArrowUp" || code === "KeyW") keysHeldRef.current.up = down;
      if (code === "ArrowDown" || code === "KeyS") keysHeldRef.current.down = down;
      if (code === "ArrowLeft" || code === "KeyA") keysHeldRef.current.left = down;
      if (code === "ArrowRight" || code === "KeyD") keysHeldRef.current.right = down;
    };

    const onKey = (e: KeyboardEvent) => {
      if (!isMpBoardInputActive()) return;
      if (!isMpGameKey(e.code)) return;
      if (e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        e.preventDefault();
        pushInput({ ability: "boost" });
        return;
      }
      if (e.code === "KeyQ") {
        e.preventDefault();
        pushInput({ ability: "cutter" });
        return;
      }
      if (e.code === "KeyE") {
        e.preventDefault();
        pushInput({ ability: "shield" });
        return;
      }
      if (
        e.code !== "ArrowUp" &&
        e.code !== "ArrowDown" &&
        e.code !== "ArrowLeft" &&
        e.code !== "ArrowRight" &&
        e.code !== "KeyW" &&
        e.code !== "KeyA" &&
        e.code !== "KeyS" &&
        e.code !== "KeyD"
      ) {
        return;
      }
      e.preventDefault();
      setKey(e.code, true);
      syncSteerFromKeys();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isMpBoardInputActive()) return;
      if (
        e.code !== "ArrowUp" &&
        e.code !== "ArrowDown" &&
        e.code !== "ArrowLeft" &&
        e.code !== "ArrowRight" &&
        e.code !== "KeyW" &&
        e.code !== "KeyA" &&
        e.code !== "KeyS" &&
        e.code !== "KeyD"
      ) {
        return;
      }
      setKey(e.code, false);
      syncSteerFromKeys();
    };

    const board = document.querySelector("[data-mp-play-board]") as HTMLElement | null;
    if (!board) return;
    const onKeyBoard = onKey as EventListener;
    const onKeyUpBoard = onKeyUp as EventListener;
    board.addEventListener("keydown", onKeyBoard);
    board.addEventListener("keyup", onKeyUpBoard);
    return () => {
      board.removeEventListener("keydown", onKeyBoard);
      board.removeEventListener("keyup", onKeyUpBoard);
      keysHeldRef.current = { up: false, down: false, left: false, right: false };
      applySteer(0, 0);
    };
  }, [started, alive, world.roundOver, syncSteerFromKeys, pushInput, applySteer]);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const code = roomRef.current;
      const hostNow = resolveTwSimulationHost(deviceId, code, {
        lastHostStateAt: lastHostStateAt.current,
        startedAt: gameStartedAtRef.current,
        now: Date.now(),
      });
      forceSimHostRef.current = hostNow;
      isHostRef.current = hostNow;
      setIsHost(hostNow);

      const w = worldRef.current;
      refreshKeyboardSteer();

      if (hostNow) {
        const room = getRoom(code);
        sync(code);
        let humans = collectHumans(code, deviceId, nickname, color);
        if (!humans.some((h) => h.id === deviceId)) {
          humans = [{ id: deviceId, nickname, color }, ...humans];
        }
        reconcileHumans(w, humans);

        if (w.roundOver && rematchRequestedRef.current) {
          rematchRequestedRef.current = false;
          const next = restartTwRound(w, humans);
          worldRef.current = next;
          setWorld(next);
          send(code, "state", serializeTwState(next));
          setBanner(null);
          return;
        }

        const applyInp = (inp: TwInput, force = false) => {
          if (!inp.deviceId) return;
          const at = inp.at ?? 0;
          if (!force && at <= (lastGuestInputAt.current[inp.deviceId] ?? 0)) return;
          lastGuestInputAt.current[inp.deviceId] = at;
          applyTwInput(w, inp, Date.now());
        };

        for (const inp of Object.values(lastInputsRef.current)) {
          applyInp({ ...inp, at: Date.now() }, true);
        }
        const gsInputs = room?.gameState ?? {};
        for (const key of Object.keys(gsInputs)) {
          if (!key.startsWith("input:")) continue;
          const payload = gsInputs[key] as TwInput | undefined;
          if (payload) {
            lastInputsRef.current[payload.deviceId] = payload;
            applyInp(payload, true);
          }
        }
        for (const inp of pendingInputs.current.splice(0)) applyInp(inp, true);

        const humanCount = humans.filter((h) => !h.id.startsWith("bot:")).length;
        tickTerritoryWorld(w, Date.now(), { skipBots: humanCount >= 2 });

        const next = snapWorld(w);
        worldRef.current = next;
        setWorld(next);
        setNowTick(Date.now());
        send(code, "state", serializeTwState(next));
      } else {
        setNowTick(Date.now());
      }
    }, TW_TICK_MS);
    return () => window.clearInterval(id);
  }, [started, deviceId, nickname, color, refreshKeyboardSteer]);

  useEffect(() => {
    if (!started) return;
    const code = roomCode;
    return subscribeRoom(code, (room) => {
      const gs = room.gameState ?? {};
      const last = String(gs._lastEvent ?? "");
      const amHost = room.hostId === deviceId;

      if (amHost) {
        const w = worldRef.current;
        reconcileHumans(w, collectHumans(code, deviceId, nickname, color));
      }

      if (last === "tw:rematch") {
        rematchRequestedRef.current = true;
        if (amHost) return;
      }

      if (last === "state" && gs.state) {
        if (amHost || forceSimHostRef.current) return;
        const state = gs.state as TwSyncState;
        lastHostStateAt.current = Date.now();
        const w = worldRef.current;
        applyTwSyncState(w, state, { rejectStaleTick: true });
        worldRef.current = snapWorld(w);
        setWorld(snapWorld(w));
      }
    });
  }, [started, roomCode, deviceId, nickname, color]);

  useEffect(() => {
    if (!started) return;
    const loop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        drawWorld(ctx, worldRef.current, cameraFocus(worldRef.current.players[deviceId]), deviceId, Date.now());
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, deviceId]);

  useEffect(() => {
    if (world.tick === prevTickRef.current) return;
    prevTickRef.current = world.tick;

    if (me && prevAliveRef.current && !me.alive) {
      setKoFlash(true);
      window.setTimeout(() => setKoFlash(false), 450);
    }
    if (me) prevAliveRef.current = me.alive;

    if (rank === 1 && rank < prevRankRef.current) {
      setBanner("YOU ARE #1");
      window.setTimeout(() => setBanner(null), 1400);
    }
    if (rank > 0) prevRankRef.current = rank;

    for (const p of Object.values(world.players)) {
      const fb = p.feedback;
      if (!fb) continue;
      const id = popupIdRef.current++;
      const now = Date.now();
      const ox = fb.x - cam.x + VIEW / 2;
      const oy = fb.y - cam.y + VIEW / 2;
      const colorFb =
        fb.kind === "cut" || fb.kind === "big_claim" || fb.kind === "mega_claim"
          ? "#fbbf24"
          : fb.kind === "danger" || fb.kind === "ko" || fb.kind === "trail_cut"
            ? "#f87171"
            : fb.kind === "boost_ready" || fb.kind === "boost"
              ? "#67e8f9"
              : fb.kind === "cutter_ready" || fb.kind === "cutter"
                ? "#fcd34d"
                : fb.kind === "shield_ready" || fb.kind === "shield_block" || fb.kind === "shield"
                  ? "#a78bfa"
                  : "#86efac";
      const scale =
        fb.kind === "mega_claim" || fb.kind === "cut" || fb.kind === "ko" ? 1.2 : 1;
      setPopups((prev) => [
        ...prev,
        {
          id,
          sx: ox,
          sy: oy,
          text: fb.text,
          color: colorFb,
          until: now + (fb.kind === "ko" || fb.kind === "trail_cut" ? 1200 : 900),
          scale,
        },
      ]);
    }
  }, [world.tick, world.players, rank, cam.x, cam.y, me]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setPopups((p) => (p.some((x) => x.until <= now) ? p.filter((x) => x.until > now) : p));
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!me) return;
    setBestTerritory(saveBest(me.territoryPct));
  }, [me?.territoryPct]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & {
      __TW_QA__?: () => {
        tick: number;
        deviceId: string;
        isHost: boolean;
        players: Array<{
          id: string;
          x: number;
          y: number;
          vx: number;
          vy: number;
          hasAim: boolean;
          outside: boolean;
          territoryPct: number;
          trailLen: number;
          alive: boolean;
          knockouts: number;
        }>;
        ownerCells: number;
      };
      __TW_QA_INPUT__?: (dx: number, dy: number, opts?: { boost?: boolean }) => void;
    };
    w.__TW_QA__ = () => {
      const cur = worldRef.current;
      let owned = 0;
      for (let i = 0; i < cur.owner.length; i++) if (cur.owner[i]! > 0) owned++;
      return {
        tick: cur.tick,
        deviceId,
        isHost: isHostRef.current,
        players: Object.values(cur.players).map((p) => ({
          id: p.id,
          x: Math.round(p.x * 10) / 10,
          y: Math.round(p.y * 10) / 10,
          vx: Math.round(p.vx * 100) / 100,
          vy: Math.round(p.vy * 100) / 100,
          hasAim: p.hasAim,
          outside: p.outside,
          territoryPct: p.territoryPct,
          trailLen: p.trail.length,
          alive: p.alive,
          knockouts: p.knockouts,
        })),
        ownerCells: owned,
      };
    };
    w.__TW_QA_INPUT__ = (dx, dy, opts) =>
      pushInput({
        dx,
        dy,
        ability: opts?.boost ? "boost" : undefined,
      });
  }, [deviceId, pushInput]);

  const onPlay = useCallback(() => {
    const humans = collectHumans(roomCode, deviceId, nickname, color);
    const w = createTerritoryWorld(deviceId, nickname, humans);
    worldRef.current = w;
    setWorld(w);
    setStarted(true);
    gameStartedAtRef.current = Date.now();
    lastHostStateAt.current = 0;
    prevAliveRef.current = true;
    setBanner(null);
    if (getRoom(roomCode)?.hostId === deviceId) {
      send(roomCode, "state", serializeTwState(w));
    }
  }, [deviceId, nickname, color, roomCode]);

  const onRematch = useCallback(() => {
    rematchRequestedRef.current = true;
    send(roomRef.current, "tw:rematch", { at: Date.now() });
    if (isHostRef.current) {
      const humans = collectHumans(roomRef.current, deviceId, nickname, color);
      const next = restartTwRound(worldRef.current, humans);
      rematchRequestedRef.current = false;
      worldRef.current = next;
      setWorld(next);
      send(roomRef.current, "state", serializeTwState(next));
      prevAliveRef.current = true;
      gameStartedAtRef.current = Date.now();
      lastHostStateAt.current = 0;
      setBanner(null);
    }
  }, [deviceId, nickname, color]);

  const onExit = useCallback(() => {
    keysHeldRef.current = { up: false, down: false, left: false, right: false };
    applySteer(0, 0);
    document.querySelector("[data-mp-play-board]")?.removeAttribute("data-mp-board-input");
    try {
      leaveRoom(roomRef.current);
    } catch {
      /* ignore */
    }
    window.location.href = "/";
  }, [applySteer]);

  const onboardHint = ONBOARD_HINTS.find((h) => world.tick < h.untilTick);
  const deathTitle =
    me?.deathCause === "enemy"
      ? `Cut by ${me.killerNickname ?? "enemy"}`
      : me?.deathCause === "self"
        ? "You hit your trail"
        : "Trail Cut";
  const deathSubtitle =
    me?.deathCause === "enemy"
      ? "Enemy crossed your trail — return faster next time"
      : me?.deathCause === "self"
        ? "Don't cross your own trail while expanding"
        : "Your trail was broken";
  const boostPct = me?.boostCharge ?? 0;
  const cutterPct = me?.cutterCharge ?? 0;
  const shieldPct = me?.shieldCharge ?? 0;

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Territory War"
        subtitle="Leave territory · draw trail · return to expand · cut enemies"
        styles={TW_STYLES}
        styleId={styleId}
        onStyleChange={setStyleId}
        color={color}
        onColorChange={setColor}
        roomCode={roomCode}
        onPlay={onPlay}
        playLabel="EXPAND"
      />
    );
  }

  return (
    <MultiplayerPlayShell
      inputActive={started && alive && !world.roundOver}
      onExit={onExit}
      topBar={
        <div className="flex w-full max-w-xl items-center justify-between gap-2 text-xs text-white/90">
          <span className="font-mono tabular-nums">
            TIME {mm}:{ss}
          </span>
          <span>
            TERRITORY {territoryPct.toFixed(1)}% · SCORE {score} · RANK #{rank || "—"}
          </span>
          <span className="truncate opacity-70">
            {roomCode} {isHost ? "HOST" : ""}
          </span>
        </div>
      }
      sideHud={
        <MultiplayerSideRankHud
          title="TERRITORY"
          selfId={deviceId}
          entries={world.rankings.map((r) => ({
            id: r.id,
            label: r.nickname.slice(0, 8),
            value: `${r.territoryPct.toFixed(1)}%`,
          }))}
        />
      }
    >
      <div className="relative mx-auto overflow-hidden rounded-xl border border-white/10" style={{ width: VIEW, height: VIEW }}>
        <canvas ref={canvasRef} width={VIEW} height={VIEW} className="block" />
        {koFlash ? (
          <div className="pointer-events-none absolute inset-0 bg-red-500/25 animate-pulse" />
        ) : null}
        {onboardHint ? (
          <div className="pointer-events-none absolute inset-x-3 top-3 rounded-lg border border-white/15 bg-black/55 px-3 py-2 text-center text-xs font-medium text-white/95">
            {onboardHint.text}
          </div>
        ) : null}
        {banner ? (
          <div className="pointer-events-none absolute inset-x-0 top-14 text-center text-sm font-bold tracking-wide text-amber-300">
            {banner}
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 space-y-1 text-[10px] font-semibold text-white/90">
          <div className="flex items-center gap-2">
            <span className="w-14">⚡ BOOST</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-black/50">
              <div
                className="h-full bg-cyan-400 transition-all"
                style={{ width: `${(boostPct / TW_ABILITY_READY) * 100}%` }}
              />
            </div>
            <span className={boostPct >= TW_ABILITY_READY ? "text-cyan-300 font-bold" : ""}>
              {boostPct >= TW_ABILITY_READY ? "READY · Space" : `${Math.round(boostPct)}%`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14">✂️ CUT</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-black/50">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${(cutterPct / TW_ABILITY_READY) * 100}%` }}
              />
            </div>
            <span className={cutterPct >= TW_ABILITY_READY ? "text-amber-300 font-bold" : ""}>
              {cutterPct >= TW_ABILITY_READY ? "READY · Q" : `${Math.round(cutterPct)}%`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14">🛡️ SHLD</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-black/50">
              <div
                className="h-full bg-violet-400 transition-all"
                style={{ width: `${(shieldPct / TW_ABILITY_READY) * 100}%` }}
              />
            </div>
            <span className={shieldPct >= TW_ABILITY_READY ? "text-violet-300 font-bold" : ""}>
              {shieldPct >= TW_ABILITY_READY ? "READY · E" : `${Math.round(shieldPct)}%`}
            </span>
          </div>
        </div>
        {popups.map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute font-bold"
            style={{
              left: p.sx,
              top: p.sy,
              transform: `translate(-50%, -50%) scale(${p.scale ?? 1})`,
              color: p.color,
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
              fontSize: p.text.includes("BIG") || p.text.includes("MEGA") ? 16 : p.text.includes("CUT") ? 14 : 13,
            }}
          >
            {p.text}
          </div>
        ))}
      </div>

      <MultiplayerYouBar metric={`T:${territoryPct.toFixed(1)}% · S:${score} · KO:${knockouts}`} rank={rank || undefined} />

      {started && !world.roundOver ? (
        <MobileControlPad
          onSteer={applySteer}
          actions={[
            {
              id: "boost",
              label: boostPct >= TW_ABILITY_READY ? "⚡ GO" : "⚡",
              mode: "tap",
              onPress: () => pushInput({ ability: "boost" }),
            },
            {
              id: "cutter",
              label: cutterPct >= TW_ABILITY_READY ? "✂️ GO" : "✂️",
              mode: "tap",
              onPress: () => pushInput({ ability: "cutter" }),
            },
            {
              id: "shield",
              label: shieldPct >= TW_ABILITY_READY ? "🛡 GO" : "🛡",
              mode: "tap",
              onPress: () => pushInput({ ability: "shield" }),
            },
          ]}
        />
      ) : null}

      {started && !world.roundOver && me && !me.alive ? (
        <MultiplayerDeathOverlay
          title={deathTitle}
          score={score}
          metric={`Territory ${territoryPct.toFixed(1)}% · KO ${knockouts} · ${deathSubtitle}`}
          onRetry={onRematch}
          onExit={onExit}
        />
      ) : null}

      {world.roundOver ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-5 text-white">
            <h2 className="text-center text-lg font-bold">ROUND OVER</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Territory</span>
                <span>{territoryPct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Score</span>
                <span>{score}</span>
              </div>
              <div className="flex justify-between">
                <span>KO</span>
                <span>{knockouts}</span>
              </div>
              <div className="flex justify-between">
                <span>Rank</span>
                <span>#{me?.place ?? rank}</span>
              </div>
              <div className="flex justify-between">
                <span>Best Territory</span>
                <span>{bestTerritory.toFixed(1)}%</span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onRematch} className="flex-1 rounded-lg bg-cyan-500 py-2.5 text-sm font-semibold text-black">
                REMATCH
              </button>
              <button type="button" onClick={onExit} className="flex-1 rounded-lg border border-white/20 py-2.5 text-sm">
                EXIT
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MultiplayerPlayShell>
  );
}
