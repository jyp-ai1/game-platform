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
  RF_EXPAND_COST,
  RF_ATTACK_COST,
  applyRfAction,
  applyRfSyncState,
  canAttack,
  canExpand,
  cellAt,
  createRfWorld,
  localNation,
  reconcileHumans,
  restartRfRound,
  rfQaForceWin,
  serializeRfState,
  tickRfWorld,
  type HumanSeat,
  type RfAction,
  type RfSyncState,
  type RfWorld,
} from "./re-front-engine";

const VIEW = 640;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;

const RF_STYLES: MpStyleOption[] = [
  { id: "cyan", label: "Cyan", emoji: "🔵", color: MP_PLAYER_COLORS[0]! },
  { id: "pink", label: "Pink", emoji: "🩷", color: MP_PLAYER_COLORS[1]! },
  { id: "gold", label: "Gold", emoji: "🟡", color: MP_PLAYER_COLORS[2]! },
  { id: "green", label: "Green", emoji: "🟢", color: MP_PLAYER_COLORS[3]! },
];

function resolveRoomCode(): string {
  if (typeof window === "undefined") return "RF-LOBBY";
  const q = new URLSearchParams(window.location.search).get("room");
  return (q && q.trim()) || "RF-LOBBY";
}

function snapWorld(w: RfWorld): RfWorld {
  return {
    ...w,
    owner: new Uint8Array(w.owner),
    nations: Object.fromEntries(Object.entries(w.nations).map(([k, n]) => [k, { ...n }])),
    slotToId: { ...w.slotToId },
    idToSlot: { ...w.idToSlot },
    flashes: w.flashes.map((f) => ({ ...f })),
    popups: w.popups.map((p) => ({ ...p })),
    rankings: w.rankings.slice(),
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
  cam: { x: number; y: number },
  zoom: number
): { cx: number; cy: number } | null {
  const mapPx = RF_GRID * RF_CELL * zoom;
  const ox = (VIEW - mapPx) / 2 - cam.x * RF_CELL * zoom;
  const oy = (VIEW - mapPx) / 2 - cam.y * RF_CELL * zoom;
  const cx = Math.floor((sx - ox) / (RF_CELL * zoom));
  const cy = Math.floor((sy - oy) / (RF_CELL * zoom));
  if (cx < 0 || cy < 0 || cx >= RF_GRID || cy >= RF_GRID) return null;
  return { cx, cy };
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
  const [zoom, setZoom] = useState(1);
  const [isHost, setIsHost] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedAtRef = useRef(Date.now());
  const lastHostStateAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const me = localNation(world, deviceId);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const w = worldRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mapPx = RF_GRID * RF_CELL * zoom;
    const ox = (VIEW - mapPx) / 2 - cam.x * RF_CELL * zoom;
    const oy = (VIEW - mapPx) / 2 - cam.y * RF_CELL * zoom;

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, VIEW, VIEW);

    for (let cy = 0; cy < RF_GRID; cy++) {
      for (let cx = 0; cx < RF_GRID; cx++) {
        const slot = w.owner[cy * RF_GRID + cx]!;
        const sx = ox + cx * RF_CELL * zoom;
        const sy = oy + cy * RF_CELL * zoom;
        const sz = RF_CELL * zoom + 0.5;
        if (slot === 0) {
          ctx.fillStyle = "#1e293b";
        } else {
          const id = w.slotToId[slot];
          const n = id ? w.nations[id] : undefined;
          ctx.fillStyle = n?.color ?? "#64748b";
          if (n && !n.alive) ctx.fillStyle = "#334155";
        }
        ctx.fillRect(sx, sy, sz, sz);
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

    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.fillRect(0, 0, VIEW, 28);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px system-ui,sans-serif";
    ctx.fillText("Re:Front — expand · grow · conquer", 10, 18);
  }, [cam, selected, zoom]);

  useEffect(() => {
    draw();
  }, [world, draw, nowMs]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const dispatchAction = useCallback(
    (action: RfAction) => {
      const w = snapWorld(worldRef.current);
      const host = isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current);
      if (host) {
        applyRfAction(w, action);
        tickRfWorld(w);
        setWorld(w);
        send(roomCode, "state", serializeRfState(w));
        lastHostStateAtRef.current = Date.now();
      } else {
        send(roomCode, "rf:action", action);
      }
    },
    [deviceId, roomCode]
  );

  const onExpand = useCallback(() => {
    if (!selected || !me?.alive) return;
    dispatchAction({ type: "expand", cx: selected.cx, cy: selected.cy, nationId: deviceId });
  }, [deviceId, dispatchAction, me?.alive, selected]);

  const onAttack = useCallback(() => {
    if (!selected || !me?.alive) return;
    dispatchAction({ type: "attack", cx: selected.cx, cy: selected.cy, nationId: deviceId });
  }, [deviceId, dispatchAction, me?.alive, selected]);

  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * VIEW;
      const sy = ((e.clientY - rect.top) / rect.height) * VIEW;
      const cell = screenToCell(sx, sy, cam, zoom);
      if (cell) setSelected(cell);
    },
    [cam, zoom]
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
      w.fastVictoryPct = 12;
    }
    reconcileHumans(w, humans);
    worldRef.current = w;
    setWorld(w);
    setStarted(true);
    startedAtRef.current = Date.now();

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
  }, [color, deviceId, nickname, roomCode]);

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
      send(roomCode, "state", serializeRfState(w));
    }
    setSelected(null);
  }, [color, deviceId, nickname, roomCode]);

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
    (window as unknown as { __RF_QA__?: () => unknown }).__RF_QA__ = () => {
      const w = worldRef.current;
      const n = localNation(w, deviceId);
      return {
        deviceId,
        isHost,
        tick: w.tick,
        roundOver: w.roundOver,
        winnerId: w.winnerId,
        me: n,
        nations: Object.values(w.nations).map((x) => ({
          id: x.id,
          nickname: x.nickname,
          alive: x.alive,
          isBot: x.isBot,
          territoryPct: x.territoryPct,
          gold: Math.floor(x.gold),
          troops: Math.floor(x.troops),
        })),
        selected,
      };
    };
    (window as unknown as { __RF_QA_ACTION__?: (type: string, cx: number, cy: number) => boolean }).__RF_QA_ACTION__ =
      (type, cx, cy) => {
        const action: RfAction =
          type === "attack"
            ? { type: "attack", cx, cy, nationId: deviceId }
            : { type: "expand", cx, cy, nationId: deviceId };
        const host = isSimHost(roomCode, deviceId, lastHostStateAtRef.current, startedAtRef.current);
        if (host) {
          const w = snapWorld(worldRef.current);
          const ok = applyRfAction(w, action);
          if (ok) {
            tickRfWorld(w);
            worldRef.current = w;
            setWorld(w);
            send(roomCode, "state", serializeRfState(w));
            lastHostStateAtRef.current = Date.now();
          }
          return ok;
        }
        send(roomCode, "rf:action", action);
        return true;
      };
    (window as unknown as { __RF_QA_FIND__?: (kind: string) => { cx: number; cy: number } | null }).__RF_QA_FIND__ = (
      kind
    ) => {
      const w = worldRef.current;
      if (kind === "expand-toward-enemy") {
        const meN = w.nations[deviceId];
        if (!meN) return null;
        let best: { cx: number; cy: number; d: number } | null = null;
        for (let cy = 0; cy < RF_GRID; cy++) {
          for (let cx = 0; cx < RF_GRID; cx++) {
            if (!canExpand(w, cx, cy, deviceId)) continue;
            let minD = Infinity;
            for (let ey = 0; ey < RF_GRID; ey++) {
              for (let ex = 0; ex < RF_GRID; ex++) {
                const slot = w.owner[ey * RF_GRID + ex]!;
                if (!slot || slot === meN.slot) continue;
                minD = Math.min(minD, Math.hypot(cx - ex, cy - ey));
              }
            }
            if (!best || minD < best.d) best = { cx, cy, d: minD };
          }
        }
        return best ? { cx: best.cx, cy: best.cy } : null;
      }
      for (let cy = 0; cy < RF_GRID; cy++) {
        for (let cx = 0; cx < RF_GRID; cx++) {
          if (kind === "attack" && canAttack(w, cx, cy, deviceId)) return { cx, cy };
          if (kind === "expand" && canExpand(w, cx, cy, deviceId)) return { cx, cy };
        }
      }
      return null;
    };
    (window as unknown as { __RF_QA_WIN__?: () => void }).__RF_QA_WIN__ = () => {
      const w = snapWorld(worldRef.current);
      rfQaForceWin(w, deviceId);
      worldRef.current = w;
      setWorld(w);
      send(roomCode, "state", serializeRfState(w));
    };
    (window as unknown as { __RF_QA_BRING_COMBAT__?: () => boolean }).__RF_QA_BRING_COMBAT__ = () => {
      const w = snapWorld(worldRef.current);
      const meN = w.nations[deviceId];
      if (!meN) return false;
      for (let i = 0; i < 80; i++) {
        tickRfWorld(w);
        let atk: { cx: number; cy: number } | null = null;
        for (let cy = 0; cy < RF_GRID; cy++) {
          for (let cx = 0; cx < RF_GRID; cx++) {
            if (canAttack(w, cx, cy, deviceId)) {
              atk = { cx, cy };
              break;
            }
          }
          if (atk) break;
        }
        if (atk) {
          applyRfAction(w, { type: "attack", cx: atk.cx, cy: atk.cy, nationId: deviceId });
          worldRef.current = w;
          setWorld(w);
          send(roomCode, "state", serializeRfState(w));
          return true;
        }
        let best: { cx: number; cy: number; d: number } | null = null;
        for (let cy = 0; cy < RF_GRID; cy++) {
          for (let cx = 0; cx < RF_GRID; cx++) {
            if (!canExpand(w, cx, cy, deviceId)) continue;
            let minD = Infinity;
            for (let ey = 0; ey < RF_GRID; ey++) {
              for (let ex = 0; ex < RF_GRID; ex++) {
                const slot = w.owner[ey * RF_GRID + ex]!;
                if (!slot || slot === meN.slot) continue;
                minD = Math.min(minD, Math.hypot(cx - ex, cy - ey));
              }
            }
            if (!best || minD < best.d) best = { cx, cy, d: minD };
          }
        }
        if (best) applyRfAction(w, { type: "expand", cx: best.cx, cy: best.cy, nationId: deviceId });
      }
      worldRef.current = w;
      setWorld(w);
      send(roomCode, "state", serializeRfState(w));
      return false;
    };
  }, [deviceId, isHost, roomCode, selected]);

  const selectedInfo = selected ? cellAt(world, selected.cx, selected.cy) : null;
  const canExp = selected && me ? canExpand(world, selected.cx, selected.cy, deviceId) : false;
  const canAtk = selected && me ? canAttack(world, selected.cx, selected.cy, deviceId) : false;

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Re:Front"
        subtitle="Expand your nation · grow economy · conquer rivals"
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
        playLabel="DEPLOY"
        onPlay={startGame}
      />
    );
  }

  const won = world.roundOver && world.winnerId === deviceId;
  const lost = world.roundOver && world.winnerId !== deviceId;

  return (
    <MultiplayerPlayShell inputActive={!world.roundOver} onExit={onExit}>
      <div className="relative mx-auto w-full max-w-[640px] select-none">
        <canvas
          ref={canvasRef}
          width={VIEW}
          height={VIEW}
          className="w-full touch-none rounded-lg border border-slate-700/80 bg-slate-950"
          data-mp-play-board
          data-mp-board-input="active"
          onClick={onCanvasClick}
          onWheel={onWheel}
        />

        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-200">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/80 p-2">
            <div>Territory {me?.territoryPct ?? 0}%</div>
            <div>Gold {Math.floor(me?.gold ?? 0).toLocaleString()}</div>
            <div>Troops {Math.floor(me?.troops ?? 0).toLocaleString()}</div>
            <div className="mt-1 text-[10px] text-slate-400">
              Expand {RF_EXPAND_COST} · Attack {RF_ATTACK_COST} troops — grow or strike?
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/80 p-2">
            <div className="text-xs text-slate-400">Selected</div>
            <div>{selected ? `(${selected.cx}, ${selected.cy})` : "Click map"}</div>
            <div>{selectedInfo?.nation?.nickname ?? (selectedInfo?.slot ? "Neutral" : "—")}</div>
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!canExp || world.roundOver}
            onClick={onExpand}
            className="flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            EXPAND
          </button>
          <button
            type="button"
            disabled={!canAtk || world.roundOver}
            onClick={onAttack}
            className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            ATTACK
          </button>
        </div>

        {world.popups.map((p) =>
          p.until > nowMs ? (
            <div
              key={p.id}
              className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-bold text-white shadow-lg"
              style={{ backgroundColor: p.color + "cc" }}
            >
              {p.text}
            </div>
          ) : null
        )}

        {world.roundOver ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-900 p-6 text-center text-white">
              <h2 className="text-2xl font-bold">{won ? "YOU WIN" : lost ? "GAME OVER" : "DRAW"}</h2>
              <p className="mt-2 text-slate-300">
                Territory {me?.territoryPct ?? 0}% · Troops {Math.floor(me?.troops ?? 0)} · Gold{" "}
                {Math.floor(me?.gold ?? 0)}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={onRematch} className="rounded-lg bg-white py-2 font-bold text-black">
                  REMATCH
                </button>
                <button
                  type="button"
                  onClick={onAnotherGame}
                  className="rounded-lg border border-slate-500 py-2 font-semibold"
                >
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
