"use client";

/** BOMBER-ONLINE-002 — Classic match: Character→Color→ENTER → 4/6 → Map → battle + room sync. */
import {
  getDeviceId,
  getLastNickname,
  MP_PLAYER_COLORS,
  MultiplayerDeathOverlay,
  MultiplayerEntrySelect,
  MultiplayerMinimap,
  MultiplayerPlayShell,
  MultiplayerSideRankHud,
  MultiplayerYouBar,
  useGameSDK,
  type MpMinimapDot,
  type MpStyleOption,
} from "@game-platform/game-sdk";
import {
  ensureRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  send,
  subscribeRoom,
} from "@game-platform/multiplayer-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BOMBER_FIRE_START,
  BOMBER_TICK_MS,
  MAP_LETTERS,
  MAP_NAMES,
  applyBomberSyncState,
  createBomberWorld,
  firePowerOf,
  plantBomb,
  powerUpEmoji,
  remainingTimeSec,
  serializeBomberState,
  tickBomberWorld,
  tryMove,
  upsertRemoteBomb,
  type Bomb,
  type BomberSyncState,
  type BomberWorld,
  type HumanSeat,
  type PlayerSlots,
} from "./bomber-engine";

const CELL = 26;

const BOMBER_STYLES: MpStyleOption[] = [
  { id: "bomber", label: "Bomber", emoji: "💣", color: MP_PLAYER_COLORS[0] },
  { id: "hero", label: "Hero", emoji: "🧑", color: MP_PLAYER_COLORS[1] },
  { id: "ninja", label: "Ninja", emoji: "🥷", color: MP_PLAYER_COLORS[2] },
  { id: "robot", label: "Robot", emoji: "🤖", color: MP_PLAYER_COLORS[3] },
  { id: "ghost", label: "Ghost", emoji: "👻", color: MP_PLAYER_COLORS[4] },
];

type LobbyPhase = "entry" | "slots" | "map";

type BomberInput = {
  deviceId: string;
  dx?: number;
  dy?: number;
  plant?: boolean;
  at?: number;
};

function snap(w: BomberWorld): BomberWorld {
  return {
    tick: w.tick,
    mapId: w.mapId,
    playerSlots: w.playerSlots,
    cols: w.cols,
    rows: w.rows,
    grid: w.grid.map((r) => r.slice()),
    players: { ...w.players },
    bombs: w.bombs.slice(),
    blasts: w.blasts.slice(),
    rankings: w.rankings.slice(),
    placements: w.placements.slice(),
    deathOrder: w.deathOrder.slice(),
    matchOver: w.matchOver,
    winnerId: w.winnerId,
    isDraw: w.isDraw,
    matchStartedAt: w.matchStartedAt,
    fuseMs: w.fuseMs,
    difficulty: w.difficulty,
    powerUps: w.powerUps.slice(),
    suddenDeathActive: w.suddenDeathActive,
    suddenDeathRing: w.suddenDeathRing,
    maxFire: w.maxFire,
  };
}

function applyLocalLook(w: BomberWorld, localId: string, color: string): void {
  const p = w.players[localId];
  if (p) p.color = color;
}

function localRank(world: BomberWorld, id: string): number {
  const idx = world.placements.findIndex((r) => r.id === id);
  if (idx >= 0) return world.placements[idx]!.place;
  const ridx = world.rankings.findIndex((r) => r.id === id);
  return ridx >= 0 ? ridx + 1 : 0;
}

function collectHumans(roomCode: string, localId: string, nickname: string, color: string): HumanSeat[] {
  const room = getRoom(roomCode);
  const fromRoom =
    room?.players.map((p) => ({
      id: p.deviceId,
      nickname: p.nickname || "Player",
      color: p.deviceId === localId ? color : undefined,
    })) ?? [];
  if (fromRoom.some((h) => h.id === localId)) return fromRoom;
  return [{ id: localId, nickname, color }, ...fromRoom];
}

function MiniMapPreview({ mapId, slots }: { mapId: number; slots: PlayerSlots }) {
  const preview = useMemo(
    () => createBomberWorld("preview", "P", { playerSlots: slots, mapId }),
    [mapId, slots]
  );
  const scale = 8;
  return (
    <div
      data-testid="bomber-map-preview"
      className="relative mx-auto overflow-hidden rounded border border-white/20 bg-slate-900"
      style={{ width: preview.cols * scale, height: preview.rows * scale }}
    >
      {preview.grid.map((row, y) =>
        row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className="absolute"
            style={{
              left: x * scale,
              top: y * scale,
              width: scale - 0.5,
              height: scale - 0.5,
              background:
                cell === "hard" ? "#475569" : cell === "soft" ? "#a8a29e" : "#1e293b",
            }}
          />
        ))
      )}
      {Object.values(preview.players).map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: p.x * scale + 1,
            top: p.y * scale + 1,
            width: scale - 2,
            height: scale - 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

export function BomberGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "You", []);
  const roomCode = useMemo(() => {
    if (typeof window === "undefined") return "WORLD";
    return new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "WORLD";
  }, []);
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<BomberWorld>(() =>
    createBomberWorld(deviceId, nickname, { playerSlots: 4, mapId: 0 })
  );
  const worldRef = useRef(world);
  worldRef.current = world;
  const [lobbyPhase, setLobbyPhase] = useState<LobbyPhase>("entry");
  const [started, setStarted] = useState(false);
  const [styleId, setStyleId] = useState(BOMBER_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const [playerSlots, setPlayerSlots] = useState<PlayerSlots>(4);
  const [mapId, setMapId] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [isHost, setIsHost] = useState(true);
  const reportedRef = useRef(false);
  const pendingInputs = useRef<BomberInput[]>([]);
  const lastStateSent = useRef(0);

  const styleEmoji = BOMBER_STYLES.find((s) => s.id === styleId)?.emoji ?? "💣";

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await ensureRoom(roomCode);
        if (!mounted) return;
        const room = joinRoom(roomCode, { nickname });
        if (room) {
          setIsHost(room.hostId === deviceId || room.players[0]?.deviceId === deviceId);
        }
      } catch {
        /* local OK */
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
  }, [roomCode, nickname, deviceId]);

  const me = world.players[deviceId];
  const alive = !!me?.alive;
  const wins = me?.wins ?? 0;
  const kills = me?.kills ?? 0;
  const rank = localRank(world, deviceId);

  // Host authoritative tick + state broadcast; guest applies host state
  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const room = getRoom(roomCode);
      const hostNow =
        !room || room.hostId === deviceId || room.players[0]?.deviceId === deviceId;
      setIsHost(hostNow);

      const w = worldRef.current;

      if (hostNow) {
        const queued = pendingInputs.current.splice(0);
        for (const inp of queued) {
          if (inp.dx || inp.dy) tryMove(w, inp.deviceId, inp.dx ?? 0, inp.dy ?? 0);
          if (inp.plant) {
            const bomb = plantBomb(w, inp.deviceId, inp.at ?? Date.now());
            if (bomb) send(roomCode, "bomber:bomb", bomb);
          }
        }
        tickBomberWorld(w);
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        setNowTick(Date.now());
        if (Date.now() - lastStateSent.current >= 80) {
          lastStateSent.current = Date.now();
          send(roomCode, "state", serializeBomberState(next));
        }
        if (next.matchOver) {
          send(roomCode, "bomber:over", {
            winnerId: next.winnerId ?? null,
            isDraw: !!next.isDraw,
            placements: next.placements,
          });
        }
      } else {
        // Guest: local prediction only for self movement already applied; wait for host state
        setNowTick(Date.now());
      }
    }, BOMBER_TICK_MS);
    return () => window.clearInterval(id);
  }, [started, roomCode, deviceId]);

  // Room event subscription — guest state + host inputs + bomb visibility
  useEffect(() => {
    if (!started) return;
    return subscribeRoom(roomCode, (room) => {
      const gs = room.gameState ?? {};
      const last = String(gs._lastEvent ?? "");
      const hostId = room.hostId || room.players[0]?.deviceId;
      const amHost = hostId === deviceId;

      if (last === "state" && !amHost && gs.state) {
        const state = gs.state as BomberSyncState;
        const w = worldRef.current;
        applyBomberSyncState(w, state);
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        return;
      }

      if (last.startsWith("input:") && amHost) {
        const payload = gs[last] as BomberInput | undefined;
        if (payload?.deviceId && payload.deviceId !== deviceId) {
          pendingInputs.current.push(payload);
        }
        return;
      }

      if (last === "bomber:bomb") {
        const bomb = gs["bomber:bomb"] as Bomb | undefined;
        if (bomb && bomb.ownerId !== deviceId) {
          const w = worldRef.current;
          const had = w.bombs.some((b) => b.id === bomb.id);
          upsertRemoteBomb(w, bomb);
          if (!had) {
            const owner = w.players[bomb.ownerId];
            if (owner && owner.bombsLeft > 0) owner.bombsLeft -= 1;
          }
          const next = snap(w);
          worldRef.current = next;
          setWorld(next);
        }
      }
    });
  }, [started, roomCode, deviceId]);

  // Guest: if host already started, pull lobby cfg / join mid-match via state
  useEffect(() => {
    if (started || lobbyPhase === "entry") return;
    return subscribeRoom(roomCode, (room) => {
      const gs = room.gameState ?? {};
      if (gs["bomber:cfg"] && typeof gs["bomber:cfg"] === "object") {
        const cfg = gs["bomber:cfg"] as {
          playerSlots: PlayerSlots;
          mapId: number;
          matchStartedAt: number;
          hostId: string;
        };
        if (cfg.hostId === deviceId) return;
        setPlayerSlots(cfg.playerSlots === 6 ? 6 : 4);
        setMapId(cfg.mapId);
      }
      if (gs.state && !started) {
        const state = gs.state as BomberSyncState;
        const humans = collectHumans(roomCode, deviceId, nickname, color);
        const next = createBomberWorld(deviceId, nickname, {
          playerSlots: state.playerSlots,
          mapId: state.mapId,
          humans,
          matchStartedAt: state.matchStartedAt,
        });
        applyBomberSyncState(next, state);
        applyLocalLook(next, deviceId, color);
        worldRef.current = next;
        setWorld(next);
        setStarted(true);
        setIsHost(false);
      }
    });
  }, [started, lobbyPhase, roomCode, deviceId, nickname, color]);

  useEffect(() => {
    if (!started || reportedRef.current) return;
    if (!world.matchOver) return;
    reportedRef.current = true;
    void reportScore("bomber", wins);
  }, [started, world.matchOver, wins, reportScore]);

  const pushInput = useCallback(
    (partial: Omit<BomberInput, "deviceId">) => {
      const payload: BomberInput = { deviceId, ...partial, at: Date.now() };
      const room = getRoom(roomCode);
      const hostNow =
        !room || room.hostId === deviceId || room.players[0]?.deviceId === deviceId;

      if (hostNow) {
        // Apply immediately (do not queue — avoids double-move on next host tick)
        const w = worldRef.current;
        if (partial.dx || partial.dy) tryMove(w, deviceId, partial.dx ?? 0, partial.dy ?? 0);
        if (partial.plant) {
          const bomb = plantBomb(w, deviceId, payload.at);
          if (bomb) send(roomCode, "bomber:bomb", bomb);
        }
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
      } else {
        // Local prediction + send to host
        const w = worldRef.current;
        if (partial.dx || partial.dy) tryMove(w, deviceId, partial.dx ?? 0, partial.dy ?? 0);
        if (partial.plant) {
          const bomb = plantBomb(w, deviceId, payload.at);
          if (bomb) send(roomCode, "bomber:bomb", bomb);
        }
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        send(roomCode, `input:${deviceId}`, payload);
      }
    },
    [deviceId, roomCode]
  );

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        KeyW: [0, -1],
        KeyS: [0, 1],
        KeyA: [-1, 0],
        KeyD: [1, 0],
      };
      if (e.code === "Space") {
        e.preventDefault();
        pushInput({ plant: true });
        return;
      }
      const d = map[e.code];
      if (!d) return;
      e.preventDefault();
      pushInput({ dx: d[0], dy: d[1] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, pushInput]);

  const handleEntryDone = useCallback(() => {
    setLobbyPhase("slots");
  }, []);

  const handleSlotsNext = useCallback(() => {
    setLobbyPhase("map");
  }, []);

  const handleMatchStart = useCallback(() => {
    reportedRef.current = false;
    const humans = collectHumans(roomCode, deviceId, nickname, color);
    const matchStartedAt = Date.now();
    const next = createBomberWorld(deviceId, nickname, {
      playerSlots,
      mapId,
      humans,
      matchStartedAt,
    });
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
    setStarted(true);

    const room = getRoom(roomCode);
    const hostNow =
      !room || room.hostId === deviceId || room.players[0]?.deviceId === deviceId;
    setIsHost(hostNow);
    if (hostNow) {
      send(roomCode, "bomber:cfg", {
        playerSlots,
        mapId,
        matchStartedAt,
        hostId: deviceId,
      });
      send(roomCode, "state", serializeBomberState(next));
    }
  }, [roomCode, deviceId, nickname, color, playerSlots, mapId]);

  const handleRetry = useCallback(() => {
    reportedRef.current = false;
    setStarted(false);
    setLobbyPhase("slots");
  }, []);

  const exitToDetail = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/games/bomber";
    }
  }, []);

  const width = world.cols * CELL;
  const height = world.rows * CELL;
  const botCount = Object.values(world.players).filter((p) => p.isBot).length;
  const timeLeft = remainingTimeSec(world, nowTick);
  const showDeath = !!world.matchOver;

  if (lobbyPhase === "entry" && !started) {
    return (
      <MultiplayerEntrySelect
        title="Bomber"
        subtitle="캐릭터 · 색상 선택 후 ENTER"
        styles={BOMBER_STYLES}
        styleId={styleId}
        onStyleChange={setStyleId}
        colors={MP_PLAYER_COLORS}
        color={color}
        onColorChange={setColor}
        onPlay={handleEntryDone}
        playLabel="ENTER"
        showColorStep
        players={1}
        bots={playerSlots - 1}
        roomCode={roomCode}
      />
    );
  }

  if (lobbyPhase === "slots" && !started) {
    return (
      <div
        data-testid="bomber-slots-select"
        className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-slate-950 px-4 text-white"
      >
        <h1 className="text-2xl font-bold">Players</h1>
        <p className="text-sm text-white/60">Empty seats fill with AI</p>
        <div className="flex gap-4">
          {([4, 6] as PlayerSlots[]).map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`bomber-slots-${n}`}
              onClick={() => setPlayerSlots(n)}
              className={`rounded-xl px-8 py-4 text-xl font-semibold ${
                playerSlots === n ? "bg-cyan-500 text-black" : "bg-white/10 text-white"
              }`}
            >
              {n}인
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid="bomber-slots-next"
          onClick={handleSlotsNext}
          className="rounded-lg bg-emerald-500 px-6 py-3 font-bold text-black"
        >
          NEXT · Map
        </button>
      </div>
    );
  }

  if (lobbyPhase === "map" && !started) {
    return (
      <div
        data-testid="bomber-map-select"
        className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-slate-950 px-4 text-white"
      >
        <h1 className="text-2xl font-bold">Map Select</h1>
        <div className="flex flex-wrap justify-center gap-3">
          {MAP_NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              data-testid={`bomber-map-${MAP_LETTERS[i]}`}
              onClick={() => setMapId(i)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                mapId === i ? "bg-amber-400 text-black" : "bg-white/10"
              }`}
            >
              {MAP_LETTERS[i]} · {name}
            </button>
          ))}
        </div>
        <MiniMapPreview mapId={mapId} slots={playerSlots} />
        <p className="text-xs text-white/50">
          {playerSlots}인 · Fire start {BOMBER_FIRE_START} · Items Bomb/Fire/Speed
        </p>
        <button
          type="button"
          data-testid="bomber-match-start"
          onClick={handleMatchStart}
          className="rounded-lg bg-rose-500 px-8 py-3 text-lg font-bold text-white"
        >
          MATCH START
        </button>
      </div>
    );
  }

  const top1Id = world.placements[0]?.id ?? world.rankings[0]?.id ?? null;
  const minimapDots: MpMinimapDot[] = Object.values(world.players).map((p) => ({
    id: p.id,
    x: (p.x + 0.5) / world.cols,
    y: (p.y + 0.5) / world.rows,
    kind:
      p.id === deviceId
        ? ("self" as const)
        : p.id === top1Id
          ? ("leader" as const)
          : p.isBot
            ? ("bot" as const)
            : ("human" as const),
    rank: localRank(world, p.id) || undefined,
    alive: p.alive,
    title: `${p.nickname}${p.place ? ` #${p.place}` : ""}`,
  }));

  const rankHud = (
    <div className="flex w-full flex-col gap-2">
      <MultiplayerSideRankHud
        title="PLACE"
        selfId={deviceId}
        entries={(world.placements.length ? world.placements : world.rankings).map((r) => ({
          id: r.id,
          label: r.nickname.slice(0, 7),
          value:
            "place" in r && typeof r.place === "number"
              ? `#${r.place}`
              : `K:${r.kills}`,
        }))}
      />
      <MultiplayerMinimap dots={minimapDots} />
    </div>
  );

  const resultLabel = world.isDraw
    ? "DRAW"
    : world.winnerId === deviceId
      ? "WIN"
      : "LOSE";

  return (
    <>
      <MultiplayerPlayShell
        onExit={exitToDetail}
        sideHud={rankHud}
        topBar={
          <MultiplayerYouBar
            metric={`K:${kills}`}
            rank={rank}
            extra={
              <>
                <span
                  data-testid="bomber-match-hud"
                  className="rounded-md bg-black/55 px-2.5 py-1 tabular-nums"
                >
                  {world.playerSlots}P · {MAP_LETTERS[world.mapId % 4]} {MAP_NAMES[world.mapId % 4]}
                </span>
                <span
                  data-testid="bomber-fire-hud"
                  className="rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/80"
                >
                  FIRE {me ? firePowerOf(me) : BOMBER_FIRE_START}/{world.maxFire}
                </span>
                <span
                  data-testid="bomber-sd-hud"
                  className="rounded-md bg-black/55 px-2.5 py-1 tabular-nums"
                >
                  {world.suddenDeathActive
                    ? `SD R${world.suddenDeathRing}`
                    : `SD ${timeLeft}s`}
                </span>
                <span className="rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/70">
                  {alive ? "❤️" : "🖤"} · {isHost ? "HOST" : "SYNC"}
                </span>
              </>
            }
          />
        }
      >
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          style={{ width, height, background: "#0f172a" }}
        >
          {world.grid.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`c-${x}-${y}`}
                className="absolute"
                style={{
                  left: x * CELL,
                  top: y * CELL,
                  width: CELL - 1,
                  height: CELL - 1,
                  background:
                    cell === "hard" ? "#334155" : cell === "soft" ? "#78716c" : "#1e293b",
                }}
              />
            ))
          )}
          {world.blasts.flatMap((bl) =>
            bl.cells.map((c, i) => (
              <div
                key={`${bl.id}-${i}`}
                className="absolute bg-orange-400/80"
                style={{ left: c.x * CELL, top: c.y * CELL, width: CELL - 1, height: CELL - 1 }}
              />
            ))
          )}
          {world.powerUps.map((pu) => (
            <div
              key={pu.id}
              data-testid={`bomber-powerup-${pu.kind}`}
              className="absolute z-10 flex items-center justify-center rounded-md bg-black/40 text-base"
              style={{
                left: pu.x * CELL + 2,
                top: pu.y * CELL + 2,
                width: CELL - 4,
                height: CELL - 4,
              }}
              title={pu.kind}
            >
              {powerUpEmoji(pu.kind)}
            </div>
          ))}
          {Object.values(world.players).map((p) =>
            p.alive ? (
              <div
                key={p.id}
                className="absolute z-20 flex items-center justify-center rounded-sm text-sm"
                style={{
                  left: p.x * CELL + 4,
                  top: p.y * CELL + 4,
                  width: CELL - 8,
                  height: CELL - 8,
                  backgroundColor: p.color,
                  boxShadow: p.id === deviceId ? `0 0 8px ${p.color}` : undefined,
                }}
                title={p.nickname}
              >
                {p.id === deviceId ? styleEmoji : null}
              </div>
            ) : null
          )}
          {world.bombs.map((b) => {
            const fuseMs = world.fuseMs || 1800;
            const fuseLeft = Math.max(0, fuseMs - (nowTick - b.plantedAt));
            const urgent = fuseLeft / fuseMs < 0.45;
            return (
              <div
                key={b.id}
                data-testid="bomber-bomb"
                className={`absolute z-30 flex items-center justify-center rounded-full border-2 ${
                  urgent ? "animate-pulse border-red-400 bg-amber-100" : "border-zinc-400 bg-zinc-200"
                }`}
                style={{
                  left: b.x * CELL + 4,
                  top: b.y * CELL + 4,
                  width: CELL - 8,
                  height: CELL - 8,
                  boxShadow: urgent ? "0 0 10px rgba(248,113,113,0.9)" : "0 0 6px rgba(255,255,255,0.5)",
                }}
              >
                <span className="text-xs">💣</span>
                {urgent ? (
                  <span className="absolute -top-2 rounded bg-red-600 px-1 text-[9px] font-bold text-white">
                    {Math.ceil(fuseLeft / 1000)}
                  </span>
                ) : null}
              </div>
            );
          })}
          {!alive && !world.matchOver ? (
            <div className="absolute inset-x-0 bottom-4 z-20 text-center text-xs text-white/70">
              Spectating · last survivor wins
            </div>
          ) : null}
        </div>
      </MultiplayerPlayShell>

      {showDeath ? (
        <MultiplayerDeathOverlay
          score={wins}
          metric={`${resultLabel} · Place #${rank || "-"} · Kills ${kills}`}
          onRetry={handleRetry}
          onExit={exitToDetail}
        />
      ) : null}
    </>
  );
}
