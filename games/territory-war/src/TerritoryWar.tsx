"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDeviceId,
  getLastNickname,
  MobileControlPad,
  MP_PLAYER_COLORS,
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
  TW_CELL,
  TW_GRID,
  TW_MAX_PLAYERS,
  TW_TICK_MS,
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
    players: Object.fromEntries(Object.entries(w.players).map(([k, p]) => [k, { ...p, trail: p.trail.slice() }])),
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

type Popup = { id: number; sx: number; sy: number; text: string; color: string; until: number };

function slotColor(world: TerritoryWorld, slot: number): string {
  const id = world.slotToId[slot];
  const p = id ? world.players[id] : undefined;
  return p?.color ?? SLOT_COLORS[slot] ?? "#64748b";
}

function drawWorld(
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

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, VIEW, VIEW);

  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const i = cy * TW_GRID + cx;
      const owner = world.owner[i]!;
      const trail = world.trail[i]!;
      const sx = cx * TW_CELL - cam.x + half;
      const sy = cy * TW_CELL - cam.y + half;
      if (owner > 0) {
        ctx.fillStyle = slotColor(world, owner) + "55";
        ctx.fillRect(sx, sy, TW_CELL + 1, TW_CELL + 1);
      }
      if (trail > 0) {
        ctx.fillStyle = slotColor(world, trail) + "cc";
        ctx.fillRect(sx + 4, sy + 4, TW_CELL - 6, TW_CELL - 6);
      }
    }
  }

  for (const it of world.items) {
    const sx = it.x - cam.x + half;
    const sy = it.y - cam.y + half;
    if (sx < -20 || sy < -20 || sx > VIEW + 20 || sy > VIEW + 20) continue;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(it.kind === "boost" ? "⚡" : it.kind === "cutter" ? "✂️" : "🛡️", sx, sy);
  }

  for (const p of Object.values(world.players)) {
    if (!p.alive) continue;
    const sx = p.x - cam.x + half;
    const sy = p.y - cam.y + half;
    const r = playerVisualRadius(p);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = p.id === deviceId ? 3 : 1;
    ctx.strokeStyle = p.id === deviceId ? "#fff" : "#000";
    ctx.stroke();
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "10px sans-serif";
    ctx.fillText(p.nickname.slice(0, 8), sx, sy - r - 6);
  }
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
  const [banner, setBanner] = useState<string | null>("EXPAND YOUR TERRITORY");

  const roomRef = useRef(roomCode);
  roomRef.current = roomCode;
  const isHostRef = useRef(false);
  const pendingInputs = useRef<TwInput[]>([]);
  const lastInputsRef = useRef<Record<string, TwInput>>({});
  const lastGuestInputAt = useRef<Record<string, number>>({});
  const lastHostStateAt = useRef(0);
  const steerRef = useRef({ dx: 0, dy: 0 });
  const boostHeldRef = useRef(false);
  const popupIdRef = useRef(0);
  const prevTickRef = useRef(0);
  const prevRankRef = useRef(99);
  const rematchRequestedRef = useRef(false);
  const rafRef = useRef(0);

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
        boost: partial.boost ?? boostHeldRef.current,
        at: Date.now(),
      };
      if (isHostRef.current) {
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

  useEffect(() => {
    if (!started || !alive || world.roundOver) return;
    const onKey = (e: KeyboardEvent) => {
      let dx = 0;
      let dy = 0;
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") dy = -1;
      if (k === "arrowdown" || k === "s") dy = 1;
      if (k === "arrowleft" || k === "a") dx = -1;
      if (k === "arrowright" || k === "d") dx = 1;
      if (k === " " || k === "shift") {
        boostHeldRef.current = true;
        pushInput({ boost: true });
        return;
      }
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        applySteer(dx / len, dy / len);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " " || k === "shift") {
        boostHeldRef.current = false;
        pushInput({ boost: false });
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [started, alive, world.roundOver, applySteer, pushInput]);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const code = roomRef.current;
      const room = getRoom(code);
      const hostNow = !!room && room.hostId === deviceId;
      isHostRef.current = hostNow;
      setIsHost(hostNow);

      const w = worldRef.current;
      if (hostNow) {
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
          setBanner("EXPAND YOUR TERRITORY");
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
  }, [started, deviceId, nickname, color]);

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
        if (amHost) return;
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
        drawWorld(ctx, worldRef.current, cameraFocus(worldRef.current.players[deviceId]), deviceId);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, deviceId]);

  useEffect(() => {
    if (world.tick === prevTickRef.current) return;
    prevTickRef.current = world.tick;
    if (banner && world.tick > 60) setBanner(null);

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
        fb.kind === "cut" || fb.kind === "big_claim"
          ? "#fbbf24"
          : fb.kind === "danger" || fb.kind === "ko"
            ? "#f87171"
            : "#86efac";
      setPopups((prev) => [
        ...prev,
        { id, sx: ox, sy: oy, text: fb.text, color: colorFb, until: now + 800 },
      ]);
    }
  }, [world.tick, world.players, rank, banner, cam.x, cam.y]);

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
        players: Array<{ id: string; x: number; y: number; territoryPct: number; trailLen: number; alive: boolean }>;
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
          x: Math.round(p.x),
          y: Math.round(p.y),
          territoryPct: p.territoryPct,
          trailLen: p.trail.length,
          alive: p.alive,
        })),
        ownerCells: owned,
      };
    };
    w.__TW_QA_INPUT__ = (dx, dy, opts) => pushInput({ dx, dy, boost: opts?.boost });
  }, [deviceId, pushInput]);

  const onPlay = useCallback(() => {
    const humans = collectHumans(roomCode, deviceId, nickname, color);
    const w = createTerritoryWorld(deviceId, nickname, humans);
    worldRef.current = w;
    setWorld(w);
    setStarted(true);
    setBanner("EXPAND YOUR TERRITORY");
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
      setBanner("EXPAND YOUR TERRITORY");
    }
  }, [deviceId, nickname, color]);

  const onExit = useCallback(() => {
    window.location.href = "/";
  }, []);

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Territory War"
        subtitle="영토를 확장하고 상대 trail을 끊으세요 · 2~4인"
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
        {banner ? (
          <div className="pointer-events-none absolute inset-x-0 top-4 text-center text-sm font-bold tracking-wide text-amber-300">
            {banner}
          </div>
        ) : null}
        {popups.map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute font-bold"
            style={{
              left: p.sx,
              top: p.sy,
              transform: "translate(-50%, -50%)",
              color: p.color,
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
              fontSize: p.text.includes("BIG") ? 16 : 13,
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
              label: "BOOST",
              mode: "hold",
              onPress: () => {
                boostHeldRef.current = true;
                pushInput({ boost: true });
              },
              onRelease: () => {
                boostHeldRef.current = false;
                pushInput({ boost: false });
              },
            },
          ]}
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
