"use client";

/**
 * Agar.io — shared Multiplayer Contract (WORLD join, host-authoritative sync).
 */
import {
  getDeviceId,
  getLastNickname,
  MP_PLAYER_COLORS,
  MultiplayerDeathOverlay,
  MultiplayerEntrySelect,
  MultiplayerPlayShell,
  FLAGSHIP_CATALOG_HREF,
  MP_CONNECT_BACK_CLASS,
  MP_CONNECT_RETRY_CLASS,
  useGameSDK,
  type MpStyleOption,
} from "@game-platform/game-sdk";
import {
  createNetworkScheduler,
  createRoom,
  getRoom,
  isListedHostPresent,
  leaveRoom,
  reclaimStaleMultiplayerRoomAsync,
  resolveMultiplayerEntry,
  resolveRoomCodeFromLocation,
  roomGameStateAgeMs,
  send,
  subscribeRoom,
  sync,
  type NetworkScheduler,
} from "@game-platform/multiplayer-sdk";
import type { GameRoom } from "@game-platform/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AGAR_NETWORK_TICK_MS,
  AGAR_TICK_MS,
  AGAR_WORLD,
  applyAgarState,
  cameraFocus,
  createAgarWorld,
  massToRadius,
  reconcileAgarHumans,
  respawnPlayer,
  serializeAgarState,
  setPlayerAim,
  splitPlayer,
  tickAgarWorld,
  totalMass,
  updateRankings,
  type AgarWorld,
} from "./agar-io-engine";
import {
  agarCellNickname,
  agarHumanHudNicknames,
  agarHumanLabelAboveCell,
  shouldShowAgarCellNickname,
} from "./agar-human-display";

const VIEW = 520;
const AGAR_MAX_PLAYERS = 20;

const AGAR_STYLES: MpStyleOption[] = [
  { id: "cyan", label: "Cyan", emoji: "🔵", color: "#22d3ee" },
  { id: "violet", label: "Violet", emoji: "🟣", color: "#a78bfa" },
  { id: "pink", label: "Pink", emoji: "🩷", color: "#f472b6" },
  { id: "gold", label: "Gold", emoji: "🟡", color: "#fbbf24" },
];

type HumanSeat = { id: string; nickname: string; color?: string };
type AgarHello = { id: string; nickname: string; color?: string };

function readLiveNickname(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem("play29:nickname")?.trim() || getLastNickname() || fallback;
}

function seatsFromPlayers(
  players: Array<{ deviceId: string; nickname?: string }>,
  localId: string,
  nickname: string,
  color: string
): HumanSeat[] {
  return players.map((p) => ({
    id: p.deviceId,
    nickname: p.nickname?.trim() || nickname || "Player",
    color: p.deviceId === localId ? color : undefined,
  }));
}

function mergeHumanSeats(...lists: HumanSeat[][]): HumanSeat[] {
  const deduped = new Map<string, HumanSeat>();
  for (const list of lists) {
    for (const h of list) {
      const prev = deduped.get(h.id);
      deduped.set(h.id, {
        id: h.id,
        nickname: h.nickname || prev?.nickname || "Player",
        color: h.color ?? prev?.color,
      });
    }
  }
  return [...deduped.values()].slice(0, AGAR_MAX_PLAYERS);
}

function rememberHuman(known: Map<string, HumanSeat>, seat: HumanSeat | null | undefined): void {
  if (!seat?.id) return;
  const prev = known.get(seat.id);
  known.set(seat.id, {
    id: seat.id,
    nickname: seat.nickname || prev?.nickname || "Player",
    color: seat.color ?? prev?.color,
  });
}

function rememberHello(known: Map<string, HumanSeat>, raw: unknown): void {
  if (!raw || typeof raw !== "object") return;
  const h = raw as Partial<AgarHello>;
  if (typeof h.id !== "string" || !h.id) return;
  rememberHuman(known, {
    id: h.id,
    nickname: typeof h.nickname === "string" ? h.nickname : "Player",
    color: typeof h.color === "string" ? h.color : undefined,
  });
}

function collectHumans(
  code: string,
  localId: string,
  nickname: string,
  color: string,
  known?: Map<string, HumanSeat>,
  roomPlayers?: Array<{ deviceId: string; nickname?: string }>
): HumanSeat[] {
  const room = sync(code) ?? getRoom(code);
  const hostId = room?.hostId;
  const fromRoom = seatsFromPlayers(roomPlayers ?? room?.players ?? [], localId, nickname, color);
  let list = fromRoom.some((h) => h.id === localId)
    ? fromRoom
    : [{ id: localId, nickname, color }, ...fromRoom];
  if (known) list = [...list, ...known.values()];
  if (hostId) {
    list = [...list.filter((h) => h.id === hostId), ...list.filter((h) => h.id !== hostId)];
  }
  return mergeHumanSeats(list);
}

const AGAR_HOST_STALE_MS = 2500;

function isGhostAgarHost(room: GameRoom): boolean {
  if (!isListedHostPresent(room)) return true;
  const hasState = !!room.gameState?.["agar:state"];
  if (!hasState) return roomGameStateAgeMs(room) > 1500;
  return roomGameStateAgeMs(room) >= AGAR_HOST_STALE_MS;
}

function isLiveAgarHost(room: GameRoom): boolean {
  if (!isListedHostPresent(room)) return false;
  if (!room.gameState?.["agar:state"]) return false;
  return roomGameStateAgeMs(room) < AGAR_HOST_STALE_MS;
}

async function claimAgarHostSeat(roomCode: string, nickname: string): Promise<GameRoom | null> {
  const existing = getRoom(roomCode);
  try {
    if (existing) {
      return await reclaimStaleMultiplayerRoomAsync(existing, nickname, "agar");
    }
    return createRoom({
      code: roomCode,
      gameSlug: "agar",
      maxPlayers: AGAR_MAX_PLAYERS,
      matchMode: "public",
      hostNickname: nickname,
    });
  } catch {
    return createRoom({
      code: roomCode,
      gameSlug: "agar",
      maxPlayers: AGAR_MAX_PLAYERS,
      matchMode: "public",
      hostNickname: nickname,
    });
  }
}

export function AgarGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "You", []);
  const roomCode = useMemo(() => resolveRoomCodeFromLocation("agar"), []);
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<AgarWorld>(() => createAgarWorld(deviceId, nickname));
  const worldRef = useRef(world);
  worldRef.current = world;
  const boardRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(false);
  const [isHost, setIsHost] = useState(true);
  const [styleId, setStyleId] = useState(AGAR_STYLES[0]!.id);
  const [color, setColor] = useState<string>(AGAR_STYLES[0]!.color!);
  const reportedRef = useRef(false);
  const isHostRef = useRef(true);
  const mpRoleRef = useRef<"host" | "guest">("host");
  const lastHostStateAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const unsubRef = useRef<(() => void) | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const netSchedRef = useRef<NetworkScheduler | null>(null);
  const knownHumansRef = useRef<Map<string, HumanSeat>>(new Map());
  const helloTimersRef = useRef<number[]>([]);
  /** Guest aim coalescing — keep latest only; flush once per animation frame (not every pointermove). */
  const pendingAimRef = useRef<{ x: number; y: number } | null>(null);
  const aimFlushRafRef = useRef<number | null>(null);

  const me = world.players[deviceId];
  const alive = !!me?.alive;
  const mass = me ? Math.round(totalMass(me)) : 0;
  const cam = cameraFocus(me);

  const applyAimsFromRoom = useCallback((roomCode: string, w: AgarWorld) => {
    const room = getRoom(roomCode);
    const gs = room?.gameState ?? {};
    for (const p of room?.players ?? []) {
      const aim = gs[`agar:aim:${p.deviceId}`] as { x?: number; y?: number } | undefined;
      if (aim && typeof aim.x === "number" && typeof aim.y === "number") {
        setPlayerAim(w, p.deviceId, aim.x, aim.y);
      }
    }
  }, []);

  useEffect(() => {
    if (!started) return;
    const net = createNetworkScheduler({
      intervalMs: AGAR_NETWORK_TICK_MS,
      label: "agar",
    });
    netSchedRef.current = net;

    tickRef.current = setInterval(() => {
      if (mpRoleRef.current !== "host") return;
      isHostRef.current = true;
      setIsHost(true);

      const liveNick = readLiveNickname(nickname);
      const next = structuredClone(worldRef.current);
      const humans = collectHumans(roomCode, deviceId, liveNick, color, knownHumansRef.current);
      for (const h of humans) rememberHuman(knownHumansRef.current, h);
      reconcileAgarHumans(next, humans);
      applyAimsFromRoom(roomCode, next);
      tickAgarWorld(next);
      worldRef.current = next;
      setWorld(next);
      // Sim tick ≠ network: coalesce latest authoritative state onto scheduler.
      net.schedule(roomCode, "agar:state", serializeAgarState(next), "agar:state");
      lastHostStateAtRef.current = Date.now();
    }, AGAR_TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      net.stop();
      if (netSchedRef.current === net) netSchedRef.current = null;
    };
  }, [applyAimsFromRoom, color, deviceId, nickname, roomCode, started]);

  useEffect(() => {
    if (!started || alive || reportedRef.current) return;
    reportedRef.current = true;
    void reportScore("agar", Math.max(mass, me?.score ?? 0));
  }, [started, alive, mass, me?.score, reportScore]);

  const flushGuestAim = useCallback(() => {
    aimFlushRafRef.current = null;
    const aim = pendingAimRef.current;
    if (!aim || isHostRef.current) return;
    pendingAimRef.current = null;
    send(roomCode, `agar:aim:${deviceId}`, aim);
  }, [deviceId, roomCode]);

  const onPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = boardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const localX = ((clientX - rect.left) / rect.width) * VIEW;
      const localY = ((clientY - rect.top) / rect.height) * VIEW;
      const worldX = cam.x - VIEW / 2 + localX;
      const worldY = cam.y - VIEW / 2 + localY;
      if (isHostRef.current) {
        setPlayerAim(worldRef.current, deviceId, worldX, worldY);
      } else {
        // Coalesce: browser may fire many pointermoves; network sees at most 1/frame.
        pendingAimRef.current = { x: worldX, y: worldY };
        if (aimFlushRafRef.current == null) {
          aimFlushRafRef.current = window.requestAnimationFrame(flushGuestAim);
        }
      }
    },
    [cam.x, cam.y, deviceId, flushGuestAim]
  );

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!isHostRef.current) {
          send(roomCode, `agar:split:${deviceId}`, { at: Date.now() });
          return;
        }
        const w = structuredClone(worldRef.current);
        splitPlayer(w, deviceId);
        worldRef.current = w;
        setWorld(w);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deviceId, roomCode, started]);

  useEffect(() => {
    if (!started) return;
    const w = window as Window & {
      __AGAR_QA__?: () => {
        deviceId: string;
        mpRole: "host" | "guest";
        isHost: boolean;
        tick: number;
        food: number;
        humanNicknames: string[];
        hudHumans: string[];
        rankings: string[];
      };
      __AGAR_QA_DIE__?: () => boolean;
    };
    w.__AGAR_QA__ = () => ({
      deviceId,
      mpRole: mpRoleRef.current,
      isHost: mpRoleRef.current === "host",
      tick: worldRef.current.tick,
      food: worldRef.current.food.length,
      humanNicknames: Object.values(worldRef.current.players)
        .filter((p) => !p.isBot)
        .map((p) => p.nickname),
      hudHumans: agarHumanHudNicknames(Object.values(worldRef.current.players)),
      rankings: worldRef.current.rankings.map((r) => r.nickname),
    });
    w.__AGAR_QA_DIE__ = () => {
      const p = worldRef.current.players[deviceId];
      if (!p?.alive) return false;
      p.alive = false;
      p.cells = [];
      updateRankings(worldRef.current);
      setWorld({ ...worldRef.current });
      return true;
    };
    return () => {
      delete w.__AGAR_QA__;
      delete w.__AGAR_QA_DIE__;
    };
  }, [deviceId, started]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      netSchedRef.current?.stop();
      netSchedRef.current = null;
      if (aimFlushRafRef.current != null) {
        window.cancelAnimationFrame(aimFlushRafRef.current);
        aimFlushRafRef.current = null;
      }
      pendingAimRef.current = null;
      helloTimersRef.current.forEach((id) => window.clearTimeout(id));
      helloTimersRef.current = [];
      unsubRef.current?.();
      leaveRoom(roomCode);
    };
  }, [roomCode]);

  const handleStart = useCallback(async () => {
    setConnecting(true);
    setConnectError(false);
    reportedRef.current = false;

    const liveNick = readLiveNickname(nickname);

    const entry = await resolveMultiplayerEntry({
      gameSlug: "agar",
      roomCode,
      nickname: liveNick,
      maxPlayers: AGAR_MAX_PLAYERS,
      resolveGlobalCluster: true,
      isGhostHost: isGhostAgarHost,
      isLiveHost: isLiveAgarHost,
    });

    let role: "host" | "guest" = "guest";
    if (!entry.ok) {
      const claimed = await claimAgarHostSeat(roomCode, liveNick);
      if (!claimed) {
        setConnecting(false);
        setConnectError(true);
        return;
      }
      role = "host";
    } else {
      role = entry.role;
    }

    mpRoleRef.current = role;
    isHostRef.current = role === "host";
    setIsHost(role === "host");

    knownHumansRef.current = new Map();
    rememberHuman(knownHumansRef.current, { id: deviceId, nickname: liveNick, color });
    const humans = collectHumans(roomCode, deviceId, liveNick, color, knownHumansRef.current);
    const next = createAgarWorld(deviceId, liveNick);
    const local = next.players[deviceId];
    if (local) local.color = color;
    reconcileAgarHumans(next, humans);
    worldRef.current = next;
    setWorld(next);
    setStarted(true);
    setConnecting(false);
    startedAtRef.current = Date.now();
    lastHostStateAtRef.current = 0;

    if (mpRoleRef.current === "host") {
      (netSchedRef.current ?? { sendNow: send }).sendNow(roomCode, "agar:state", serializeAgarState(next));
      lastHostStateAtRef.current = Date.now();
    }

    unsubRef.current?.();
    unsubRef.current = subscribeRoom(roomCode, (room) => {
      const gs = room.gameState ?? {};
      const last = String(gs._lastEvent ?? "");
      rememberHello(knownHumansRef.current, gs["agar:hello"]);
      for (const p of room.players) {
        rememberHuman(knownHumansRef.current, {
          id: p.deviceId,
          nickname: p.nickname?.trim() || liveNick,
          color: p.deviceId === deviceId ? color : undefined,
        });
      }

      if (mpRoleRef.current === "host") {
        // Aim is applied on the next host tick via applyAimsFromRoom — do NOT
        // echo full world on every guest pointer event (was O(N²) egress).
        if (last.startsWith("agar:aim:")) return;

        const local = structuredClone(worldRef.current);
        const humansBefore = Object.values(local.players).filter((p) => !p.isBot).length;
        const humans = collectHumans(
          roomCode,
          deviceId,
          liveNick,
          color,
          knownHumansRef.current,
          room.players
        );
        reconcileAgarHumans(local, humans);
        if (last.startsWith("agar:split:")) {
          splitPlayer(local, last.slice("agar:split:".length));
        }
        if (last.startsWith("agar:respawn:")) {
          respawnPlayer(local, last.slice("agar:respawn:".length));
        }
        worldRef.current = local;
        setWorld(local);
        const humansAfter = Object.values(local.players).filter((p) => !p.isBot).length;
        // Immediate state only for discrete events (join / split / respawn), not aim.
        const needsImmediate =
          last.startsWith("agar:split:") ||
          last.startsWith("agar:respawn:") ||
          last === "agar:hello" ||
          humansAfter > humansBefore;
        if (needsImmediate) {
          (netSchedRef.current ?? { sendNow: send }).sendNow(
            roomCode,
            "agar:state",
            serializeAgarState(local)
          );
          lastHostStateAtRef.current = Date.now();
        }
        return;
      }

      if (last === "agar:state" && gs["agar:state"]) {
        lastHostStateAtRef.current = Date.now();
        const local = structuredClone(worldRef.current);
        applyAgarState(local, gs["agar:state"] as ReturnType<typeof serializeAgarState>, {
          rejectStaleTick: true,
        });
        worldRef.current = local;
        setWorld(local);
      }
    });

    if (mpRoleRef.current === "guest") {
      const hello: AgarHello = { id: deviceId, nickname: liveNick, color };
      send(roomCode, "agar:hello", hello);
      helloTimersRef.current.forEach((id) => window.clearTimeout(id));
      helloTimersRef.current = [200, 700, 1500].map((ms) =>
        window.setTimeout(() => {
          if (mpRoleRef.current === "guest") send(roomCode, "agar:hello", hello);
        }, ms)
      );
    }
  }, [color, deviceId, nickname, roomCode]);

  const exitToDetail = useCallback(() => {
    leaveRoom(roomCode);
    window.location.href = "/games/agar";
  }, [roomCode]);

  function handleRetry() {
    reportedRef.current = false;
    if (isHostRef.current) {
      const w = structuredClone(worldRef.current);
      respawnPlayer(w, deviceId, nickname);
      worldRef.current = w;
      setWorld(w);
      (netSchedRef.current ?? { sendNow: send }).sendNow(
        roomCode,
        "agar:state",
        serializeAgarState(w)
      );
    } else {
      send(roomCode, `agar:respawn:${deviceId}`, { at: Date.now() });
    }
  }

  const offsetX = VIEW / 2 - cam.x;
  const offsetY = VIEW / 2 - cam.y;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {!started ? (
        connecting ? (
          <div
            data-testid="agar-connecting"
            className="flex aspect-square w-full max-w-xl flex-col items-center justify-center gap-3 rounded-xl border border-white/15 bg-card/60 p-8"
          >
            <p className="text-lg font-semibold">Connecting…</p>
            <p className="text-sm text-muted-foreground">Joining {roomCode}</p>
          </div>
        ) : connectError ? (
          <div
            data-testid="agar-connect-error"
            className="flex aspect-square w-full max-w-xl flex-col items-center justify-center gap-3 rounded-xl border border-red-500/40 bg-red-950/20 p-8"
          >
            <p className="text-lg font-semibold text-red-200">Connection failed</p>
            <p className="text-sm text-muted-foreground">Could not join this room. Host may be unavailable.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                data-testid="agar-connect-retry"
                onClick={() => void handleStart()}
                className={MP_CONNECT_RETRY_CLASS}
              >
                Retry
              </button>
              <button
                type="button"
                data-testid="agar-connect-back"
                onClick={() => {
                  window.location.href = "/games/agar";
                }}
                className={MP_CONNECT_BACK_CLASS}
              >
                Back to game
              </button>
            </div>
          </div>
        ) : (
          <MultiplayerEntrySelect
            title="Agar.io"
            subtitle="세포를 키워 TOP10에 올라가세요. 작을수록 빠르고, 크면 다른 세포를 삼킬 수 있습니다."
            styles={AGAR_STYLES}
            styleId={styleId}
            onStyleChange={(id) => {
              setStyleId(id);
              const s = AGAR_STYLES.find((x) => x.id === id);
              if (s?.color) setColor(s.color);
            }}
            colors={MP_PLAYER_COLORS}
            color={color}
            onColorChange={setColor}
            roomCode={roomCode}
            playLabel="ENTER"
            onPlay={() => void handleStart()}
          />
        )
      ) : (
        <MultiplayerPlayShell onExit={exitToDetail}>
          <div className="relative w-full max-w-xl">
            <div className="mb-2 flex w-full flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
              <span>Mass {mass}</span>
              <span data-testid="agar-food-count">Food {world.food.length}</span>
              <span data-testid="agar-mp-role">{isHost ? "HOST" : "GUEST"}</span>
            </div>
            <div
              ref={boardRef}
              className="relative aspect-square w-full touch-none overflow-hidden rounded-xl border bg-[#0b1220]"
              onPointerMove={(e) => onPointer(e.clientX, e.clientY)}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                onPointer(e.clientX, e.clientY);
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                  backgroundSize: `${(40 / AGAR_WORLD) * VIEW}px ${(40 / AGAR_WORLD) * VIEW}px`,
                  backgroundPosition: `${offsetX}px ${offsetY}px`,
                }}
              />
              <div
                className="absolute left-0 top-0"
                style={{
                  width: AGAR_WORLD,
                  height: AGAR_WORLD,
                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                }}
              >
                {world.food.map((f) => (
                  <div
                    key={f.id}
                    className="absolute rounded-full"
                    style={{
                      left: f.x - 2,
                      top: f.y - 2,
                      width: 4,
                      height: 4,
                      backgroundColor: f.color,
                    }}
                  />
                ))}
                {Object.values(world.players).map((p) =>
                  p.alive
                    ? p.cells.map((c, i) => {
                        const r = massToRadius(c.mass);
                        const isHuman = !p.isBot;
                        const showNick = shouldShowAgarCellNickname(p.isBot, r);
                        const nick = agarCellNickname(p.nickname);
                        const labelAbove = agarHumanLabelAboveCell(p.isBot, r);
                        return (
                          <div
                            key={`${p.id}-${i}`}
                            className="absolute flex items-center justify-center rounded-full text-[9px] font-semibold text-white/90"
                            style={{
                              left: c.x - r,
                              top: c.y - r,
                              width: r * 2,
                              height: r * 2,
                              overflow: "visible",
                              backgroundColor: p.color,
                              border: isHuman
                                ? "2px solid rgba(255,255,255,0.92)"
                                : "1px solid rgba(255,255,255,0.2)",
                              boxShadow: isHuman
                                ? `${p.id === deviceId ? `0 0 12px ${p.color}, ` : ""}0 0 0 2px rgba(251,191,36,0.6)`
                                : p.id === deviceId
                                  ? `0 0 12px ${p.color}`
                                  : undefined,
                              zIndex: Math.round(c.mass) + (isHuman ? 80 : 0),
                            }}
                            title={p.nickname}
                            data-agar-human={isHuman ? "1" : undefined}
                            data-agar-nick={showNick ? nick : undefined}
                          >
                            {showNick ? (
                              <span
                                className={
                                  labelAbove
                                    ? "pointer-events-none absolute left-1/2 top-[-13px] -translate-x-1/2 whitespace-nowrap rounded bg-black/65 px-1 text-[9px] text-amber-100"
                                    : undefined
                                }
                              >
                                {nick}
                              </span>
                            ) : null}
                          </div>
                        );
                      })
                    : null
                )}
              </div>

              <aside
                data-testid="agar-human-roster"
                className="absolute left-2 top-2 w-36 rounded-lg border border-amber-200/30 bg-black/55 p-2 text-[11px] backdrop-blur"
              >
                <p className="mb-1 font-semibold text-amber-200">PLAYERS</p>
                <ul className="space-y-0.5">
                  {Object.values(world.players)
                    .filter((p) => !p.isBot)
                    .map((p) => (
                      <li
                        key={p.id}
                        className={p.id === deviceId ? "text-cyan-300" : "text-amber-50"}
                      >
                        {p.nickname.slice(0, 10)}
                      </li>
                    ))}
                </ul>
              </aside>

              <aside className="absolute right-2 top-2 w-36 rounded-lg border border-white/10 bg-black/50 p-2 text-[11px] backdrop-blur">
                <p className="mb-1 font-semibold text-amber-200">TOP 10</p>
                <ol className="space-y-0.5">
                  {world.rankings.map((r, i) => (
                    <li key={r.id} className="flex justify-between gap-1">
                      <span className={r.id === deviceId ? "text-cyan-300" : "text-white/80"}>
                        {i + 1}. {r.nickname.slice(0, 8)}
                      </span>
                      <span className="font-mono text-white/60">{r.mass}</span>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>

            {!alive ? (
              <div data-testid="agar-game-over">
                <MultiplayerDeathOverlay
                  title="RESULT"
                  outcome="YOU DIED"
                  score={Math.max(mass, me?.score ?? 0)}
                  metric={`Mass ${mass}${world.rankings.findIndex((r) => r.id === deviceId) >= 0 ? ` · #${world.rankings.findIndex((r) => r.id === deviceId) + 1}` : ""}`}
                  onRetry={handleRetry}
                  onAnotherGame={() => {
                    leaveRoom(roomCode);
                    window.location.href = FLAGSHIP_CATALOG_HREF;
                  }}
                  onExit={exitToDetail}
                />
              </div>
            ) : null}
          </div>
        </MultiplayerPlayShell>
      )}
    </div>
  );
}
