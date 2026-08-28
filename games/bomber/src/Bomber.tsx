"use client";

/** BOMBER-ONLINE-003 — Map→roster · same Map=same Room · instant enter · AI moves · bomb sync. */
import {
  getDeviceId,
  getLastNickname,
  MobileControlPad,
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
  type PadDirection,
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
  bomberRoomCodeForMap,
  createBomberWorld,
  firePowerOf,
  plantBomb,
  powerUpEmoji,
  reconcileHumans,
  remainingTimeSec,
  rosterForMap,
  serializeBomberState,
  tickBomberWorld,
  tryMove,
  upsertRemoteBomb,
  type Bomb,
  type BomberSyncState,
  type BomberWorld,
  type HumanSeat,
} from "./bomber-engine";

const CELL = 26;
const HOST_STATE_STALE_MS = 1200;

const BOMBER_STYLES: MpStyleOption[] = [
  { id: "bomber", label: "Bomber", emoji: "💣", color: MP_PLAYER_COLORS[0] },
  { id: "hero", label: "Hero", emoji: "🧑", color: MP_PLAYER_COLORS[1] },
  { id: "ninja", label: "Ninja", emoji: "🥷", color: MP_PLAYER_COLORS[2] },
  { id: "robot", label: "Robot", emoji: "🤖", color: MP_PLAYER_COLORS[3] },
  { id: "ghost", label: "Ghost", emoji: "👻", color: MP_PLAYER_COLORS[4] },
];

type LobbyPhase = "entry" | "map";

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

function isRoomHost(roomCode: string, deviceId: string): boolean {
  const room = getRoom(roomCode);
  if (!room) return true;
  return room.hostId === deviceId || room.players[0]?.deviceId === deviceId;
}

/** Solo client must tick locally — stale remote roster must not block input. */
function isSoloInRoom(roomCode: string, deviceId: string, world: BomberWorld): boolean {
  const aliveHumans = Object.values(world.players).filter((p) => p.alive && !p.isBot);
  if (aliveHumans.length <= 1) return true;
  const room = getRoom(roomCode);
  if (!room || room.players.length <= 1) return true;
  return room.players.every((p) => p.deviceId === deviceId);
}

function canAuthoritativeHost(roomCode: string, deviceId: string, world: BomberWorld): boolean {
  return isRoomHost(roomCode, deviceId) || isSoloInRoom(roomCode, deviceId, world);
}

function MiniMapPreview({ mapId }: { mapId: number }) {
  const slots = rosterForMap(mapId);
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
  const { reportScore } = useGameSDK();
  const [activeRoom, setActiveRoom] = useState(() => {
    if (typeof window === "undefined") return "BOMBER-A";
    const q = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
    if (q?.startsWith("BOMBER-")) return q;
    return "BOMBER-A";
  });
  /** QA-only: isolate grid/input probes from shared room stale sync (no gameplay change). */
  const qaLocalProbe = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("mp_qa_local") === "1";
  }, []);
  const qaLocalProbeRef = useRef(qaLocalProbe);
  qaLocalProbeRef.current = qaLocalProbe;
  const [world, setWorld] = useState<BomberWorld>(() =>
    createBomberWorld(deviceId, nickname, { mapId: 0 })
  );
  const worldRef = useRef(world);
  worldRef.current = world;
  const [lobbyPhase, setLobbyPhase] = useState<LobbyPhase>("entry");
  const [started, setStarted] = useState(false);
  const [styleId, setStyleId] = useState(BOMBER_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const [mapId, setMapId] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [isHost, setIsHost] = useState(true);
  const isHostRef = useRef(true);
  const setHostAuthority = useCallback((host: boolean) => {
    isHostRef.current = host;
    setIsHost(host);
  }, []);
  const reportedRef = useRef(false);
  const pendingInputs = useRef<BomberInput[]>([]);
  const lastStateSent = useRef(0);
  const lastHostStateAt = useRef(0);
  const matchLocalStartAt = useRef(0);
  const roomRef = useRef(activeRoom);
  roomRef.current = activeRoom;

  const styleEmoji = BOMBER_STYLES.find((s) => s.id === styleId)?.emoji ?? "💣";
  const playerSlots = rosterForMap(mapId);

  // Join/leave map-keyed room while in lobby or match
  useEffect(() => {
    let mounted = true;
    const code = activeRoom;
    void (async () => {
      try {
        await ensureRoom(code);
        if (!mounted) return;
        const room = joinRoom(code, { nickname });
        if (room) {
          setHostAuthority(room.hostId === deviceId || room.players[0]?.deviceId === deviceId);
        }
      } catch {
        /* local OK */
      }
    })();
    return () => {
      mounted = false;
      try {
        leaveRoom(code);
      } catch {
        /* ignore */
      }
    };
  }, [activeRoom, nickname, deviceId]);

  const me = world.players[deviceId];
  const alive = !!me?.alive;
  const wins = me?.wins ?? 0;
  const kills = me?.kills ?? 0;
  const rank = localRank(world, deviceId);

  // Authoritative tick: host, or takeover if host state goes stale (fixes frozen AI/bombs)
  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const code = roomRef.current;
      const room = getRoom(code);
      const listedHost =
        !room || room.hostId === deviceId || room.players[0]?.deviceId === deviceId;
      const everSynced = lastHostStateAt.current > 0;
      const hostFresh = Date.now() - lastHostStateAt.current < HOST_STATE_STALE_MS;
      const waitedForHost = Date.now() - matchLocalStartAt.current > 900;
      const w = worldRef.current;
      const solo = isSoloInRoom(code, deviceId, w);
      // Host ticks; guest waits briefly for host state; solo or stale → take over so input/AI/bombs run
      const hostNow =
        qaLocalProbeRef.current ||
        listedHost ||
        solo ||
        (everSynced && !hostFresh) ||
        (!everSynced && waitedForHost);
      isHostRef.current = hostNow;
      setIsHost(hostNow);

      if (hostNow) {
        const humans = collectHumans(code, deviceId, nickname, color);
        reconcileHumans(w, humans);

        const queued = pendingInputs.current.splice(0);
        for (const inp of queued) {
          if (inp.dx || inp.dy) tryMove(w, inp.deviceId, inp.dx ?? 0, inp.dy ?? 0);
          if (inp.plant) {
            const bomb = plantBomb(w, inp.deviceId, inp.at ?? Date.now());
            if (bomb) send(code, "bomber:bomb", bomb);
          }
        }
        tickBomberWorld(w);
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        setNowTick(Date.now());
        if (Date.now() - lastStateSent.current >= 80) {
          lastStateSent.current = Date.now();
          send(code, "state", serializeBomberState(next));
        }
        if (next.matchOver) {
          send(code, "bomber:over", {
            winnerId: next.winnerId ?? null,
            isDraw: !!next.isDraw,
            placements: next.placements,
          });
        }
      } else {
        setNowTick(Date.now());
      }
    }, BOMBER_TICK_MS);
    return () => window.clearInterval(id);
  }, [started, deviceId, nickname, color]);

  // Room event subscription — guest state + host inputs + bomb visibility
  useEffect(() => {
    if (!started) return;
    const code = activeRoom;
    return subscribeRoom(code, (room) => {
      const gs = room.gameState ?? {};
      const last = String(gs._lastEvent ?? "");
      const hostId = room.hostId || room.players[0]?.deviceId;
      const amHost = hostId === deviceId;

      if (last === "state" && !amHost && gs.state) {
        if (qaLocalProbeRef.current) return;
        const w = worldRef.current;
        const everSynced = lastHostStateAt.current > 0;
        const hostFresh = Date.now() - lastHostStateAt.current < HOST_STATE_STALE_MS;
        const waitedForHost = Date.now() - matchLocalStartAt.current > 900;
        const solo = isSoloInRoom(code, deviceId, w);
        const ignoreRemote =
          isHostRef.current ||
          canAuthoritativeHost(code, deviceId, w) ||
          solo ||
          (everSynced && !hostFresh) ||
          (!everSynced && waitedForHost);
        if (ignoreRemote) return;
        lastHostStateAt.current = Date.now();
        const state = gs.state as BomberSyncState;
        applyBomberSyncState(w, state);
        applyLocalLook(w, deviceId, color);
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        return;
      }

      if (last.startsWith("input:") && (amHost || isHostRef.current || canAuthoritativeHost(code, deviceId, worldRef.current))) {
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
  }, [started, activeRoom, deviceId, color, qaLocalProbe]);

  // Guest: pull existing match state for this map room (no lobby wait)
  useEffect(() => {
    if (started || lobbyPhase === "entry") return;
    const code = activeRoom;
    return subscribeRoom(code, (room) => {
      const gs = room.gameState ?? {};
      if (gs.state && !started && !qaLocalProbeRef.current) {
        const state = gs.state as BomberSyncState;
        if (state.mapId !== mapId) return;
        const humans = collectHumans(code, deviceId, nickname, color);
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
        lastHostStateAt.current = Date.now();
        setStarted(true);
        setHostAuthority(canAuthoritativeHost(code, deviceId, next));
        matchLocalStartAt.current = Date.now();
      }
    });
  }, [started, lobbyPhase, activeRoom, deviceId, nickname, color, mapId, qaLocalProbe]);

  useEffect(() => {
    if (!started || reportedRef.current) return;
    if (!world.matchOver) return;
    reportedRef.current = true;
    void reportScore("bomber", wins);
  }, [started, world.matchOver, wins, reportScore]);

  const pushInput = useCallback(
    (partial: Omit<BomberInput, "deviceId">) => {
      const code = roomRef.current;
      const payload: BomberInput = { deviceId, ...partial, at: Date.now() };
      const w = worldRef.current;
      const hostNow = qaLocalProbeRef.current || isHostRef.current || canAuthoritativeHost(code, deviceId, w);

      if (hostNow) {
        if (partial.dx || partial.dy) tryMove(w, deviceId, partial.dx ?? 0, partial.dy ?? 0);
        if (partial.plant) {
          const bomb = plantBomb(w, deviceId, payload.at);
          if (bomb) send(code, "bomber:bomb", bomb);
        }
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        return;
      }

      // Guest: host authoritative — no optimistic move (prevents 2-cell / desync).
      send(code, `input:${deviceId}`, payload);
    },
    [deviceId]
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

  /** Map select → join map room → enter match immediately (AI fills + moves). */
  const enterMapMatch = useCallback(
    (nextMapId: number) => {
      reportedRef.current = false;
      setMapId(nextMapId);
      const code = bomberRoomCodeForMap(nextMapId);
      setActiveRoom(code);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("room", code);
        window.history.replaceState({}, "", url.toString());
      }

      const slots = rosterForMap(nextMapId);
      const matchStartedAt = Date.now();

      void (async () => {
        try {
          await ensureRoom(code);
          joinRoom(code, { nickname });
        } catch {
          /* local */
        }

        const room = getRoom(code);
        const gs = room?.gameState ?? {};
        const existing = gs.state as BomberSyncState | undefined;
        if (existing && existing.mapId === nextMapId && !existing.matchOver && !qaLocalProbeRef.current) {
          const humans = collectHumans(code, deviceId, nickname, color);
          const next = createBomberWorld(deviceId, nickname, {
            playerSlots: existing.playerSlots,
            mapId: existing.mapId,
            humans,
            matchStartedAt: existing.matchStartedAt,
          });
          applyBomberSyncState(next, existing);
          applyLocalLook(next, deviceId, color);
          worldRef.current = next;
          setWorld(next);
          lastHostStateAt.current = Date.now();
          setStarted(true);
          setHostAuthority(canAuthoritativeHost(code, deviceId, next));
          matchLocalStartAt.current = Date.now();
          return;
        }

        const humans = collectHumans(code, deviceId, nickname, color);
        const next = createBomberWorld(deviceId, nickname, {
          playerSlots: slots,
          mapId: nextMapId,
          humans,
          matchStartedAt,
        });
        applyLocalLook(next, deviceId, color);
        worldRef.current = next;
        setWorld(next);
        matchLocalStartAt.current = Date.now();
        setStarted(true);

        const hostNow = qaLocalProbeRef.current || canAuthoritativeHost(code, deviceId, next);
        setHostAuthority(hostNow);
        if (hostNow) {
          send(code, "bomber:cfg", {
            playerSlots: slots,
            mapId: nextMapId,
            matchStartedAt,
            hostId: deviceId,
          });
          send(code, "state", serializeBomberState(next));
        }
      })();
    },
    [deviceId, nickname, color, qaLocalProbe]
  );

  const handleEntryDone = useCallback(() => {
    setLobbyPhase("map");
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
    if (!q?.startsWith("BOMBER-")) return;
    const letter = q.slice("BOMBER-".length);
    const idx = MAP_LETTERS.indexOf(letter as (typeof MAP_LETTERS)[number]);
    if (idx >= 0) {
      window.setTimeout(() => enterMapMatch(idx), 0);
    }
  }, [enterMapMatch]);

  const handleRetry = useCallback(() => {
    reportedRef.current = false;
    setStarted(false);
    setLobbyPhase("map");
  }, []);

  const exitToDetail = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/games/bomber";
    }
  }, []);

  const padMove = useCallback(
    (dir: PadDirection) => {
      const d: Record<PadDirection, [number, number]> = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0],
      };
      const v = d[dir];
      pushInput({ dx: v[0], dy: v[1] });
    },
    [pushInput]
  );

  const width = world.cols * CELL;
  const height = world.rows * CELL;
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
        roomCode={activeRoom}
      />
    );
  }

  if (lobbyPhase === "map" && !started) {
    return (
      <div
        data-testid="bomber-map-select"
        className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-slate-950 px-4 text-white"
      >
        <h1 className="text-2xl font-bold">Map Select</h1>
        <p className="text-sm text-white/60">Same map = same room · AI fills empty seats</p>
        <div className="flex flex-wrap justify-center gap-3">
          {MAP_NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              data-testid={`bomber-map-${MAP_LETTERS[i]}`}
              onClick={() => enterMapMatch(i)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                mapId === i ? "bg-amber-400 text-black" : "bg-white/10"
              }`}
            >
              {MAP_LETTERS[i]} · {name} · {rosterForMap(i)}P
            </button>
          ))}
        </div>
        <MiniMapPreview mapId={mapId} />
        <p className="text-xs text-white/50">
          Tap a map to enter · Fire start {BOMBER_FIRE_START} · Items Bomb/Fire/Speed
        </p>
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
                  data-testid="bomber-room-hud"
                  className="rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/80"
                >
                  {activeRoom}
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
                data-testid={p.id === deviceId ? "bomber-local-player" : undefined}
                data-grid-x={p.x}
                data-grid-y={p.y}
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

      {alive && !world.matchOver ? (
        <MobileControlPad
          onDirection={padMove}
          actions={[{ id: "bomb", label: "BOMB", mode: "tap", onPress: () => pushInput({ plant: true }) }]}
        />
      ) : null}

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
