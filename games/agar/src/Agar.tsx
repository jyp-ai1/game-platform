"use client";

/**
 * Agar.io — shared Multiplayer Contract (WORLD join, host-authoritative sync).
 */
import {
  getDeviceId,
  getLastNickname,
  MP_PLAYER_COLORS,
  MultiplayerEntrySelect,
  MultiplayerPlayShell,
  StandardGameOverOverlay,
  useGameSDK,
  type MpStyleOption,
} from "@game-platform/game-sdk";
import {
  getRoom,
  leaveRoom,
  resolveMultiplayerEntry,
  resolveRoomCodeFromLocation,
  send,
  subscribeRoom,
  sync,
} from "@game-platform/multiplayer-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
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

const VIEW = 520;
const AGAR_MAX_PLAYERS = 20;

const AGAR_STYLES: MpStyleOption[] = [
  { id: "cyan", label: "Cyan", emoji: "🔵", color: "#22d3ee" },
  { id: "violet", label: "Violet", emoji: "🟣", color: "#a78bfa" },
  { id: "pink", label: "Pink", emoji: "🩷", color: "#f472b6" },
  { id: "gold", label: "Gold", emoji: "🟡", color: "#fbbf24" },
];

type HumanSeat = { id: string; nickname: string; color?: string };

function readLiveNickname(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem("play29:nickname")?.trim() || getLastNickname() || fallback;
}

function collectHumans(code: string, localId: string, nickname: string, color: string): HumanSeat[] {
  const room = sync(code) ?? getRoom(code);
  const hostId = room?.hostId;
  const fromRoom =
    room?.players.map((p) => ({
      id: p.deviceId,
      nickname: p.nickname?.trim() || nickname || "Player",
      color: p.deviceId === localId ? color : undefined,
    })) ?? [];
  let list = fromRoom.some((h) => h.id === localId)
    ? fromRoom
    : [{ id: localId, nickname, color }, ...fromRoom];
  if (hostId) {
    list = [...list.filter((h) => h.id === hostId), ...list.filter((h) => h.id !== hostId)];
  }
  const deduped = new Map<string, HumanSeat>();
  for (const h of list) deduped.set(h.id, h);
  return [...deduped.values()].slice(0, AGAR_MAX_PLAYERS);
}

function isAgarHost(
  code: string,
  deviceId: string,
  mpRole: "host" | "guest",
  lastStateAt: number,
  startedAt: number
): boolean {
  const room = sync(code) ?? getRoom(code);
  if (mpRole === "host") {
    if (!room || room.hostId === deviceId) return true;
    if (!room.players.some((p) => p.deviceId === room.hostId)) return true;
    return room.hostId === deviceId;
  }
  if (!room) return false;
  if (room.hostId === deviceId) return true;
  if (room.players.length <= 1) return true;
  const now = Date.now();
  if (lastStateAt <= 0 && now - startedAt > 400) return false;
  if (lastStateAt > 0 && now - lastStateAt > 1200) return true;
  return false;
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

  const me = world.players[deviceId];
  const alive = !!me?.alive;
  const mass = me ? Math.round(totalMass(me)) : 0;
  const cam = cameraFocus(me);

  const applyAimsFromRoom = useCallback((roomCode: string, w: AgarWorld) => {
    const room = sync(roomCode) ?? getRoom(roomCode);
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
    tickRef.current = setInterval(() => {
      if (mpRoleRef.current !== "host") return;
      isHostRef.current = true;
      setIsHost(true);

      sync(roomCode);
      const liveNick = readLiveNickname(nickname);
      const next = structuredClone(worldRef.current);
      reconcileAgarHumans(next, collectHumans(roomCode, deviceId, liveNick, color));
      applyAimsFromRoom(roomCode, next);
      tickAgarWorld(next);
      worldRef.current = next;
      setWorld(next);
      send(roomCode, "agar:state", serializeAgarState(next));
      lastHostStateAtRef.current = Date.now();
    }, AGAR_TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [applyAimsFromRoom, deviceId, roomCode, started]);

  useEffect(() => {
    if (!started || alive || reportedRef.current) return;
    reportedRef.current = true;
    void reportScore("agar", Math.max(mass, me?.score ?? 0));
  }, [started, alive, mass, me?.score, reportScore]);

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
        send(roomCode, `agar:aim:${deviceId}`, { x: worldX, y: worldY });
      }
    },
    [cam.x, cam.y, deviceId, roomCode]
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
    });

    if (!entry.ok) {
      setConnecting(false);
      setConnectError(true);
      return;
    }

    mpRoleRef.current = entry.role;
    isHostRef.current = entry.role === "host";
    setIsHost(entry.role === "host");

    const humans = collectHumans(roomCode, deviceId, liveNick, color);
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
      send(roomCode, "agar:state", serializeAgarState(next));
      lastHostStateAtRef.current = Date.now();
    }

    unsubRef.current?.();
    unsubRef.current = subscribeRoom(roomCode, (room) => {
      const gs = room.gameState ?? {};
      const last = String(gs._lastEvent ?? "");

      if (mpRoleRef.current === "host") {
        const local = structuredClone(worldRef.current);
        sync(roomCode);
        reconcileAgarHumans(local, collectHumans(roomCode, deviceId, liveNick, color));
        if (last.startsWith("agar:split:")) {
          splitPlayer(local, last.slice("agar:split:".length));
        }
        if (last.startsWith("agar:respawn:")) {
          respawnPlayer(local, last.slice("agar:respawn:".length));
        }
        worldRef.current = local;
        setWorld(local);
        if (last !== "agar:state") {
          send(roomCode, "agar:state", serializeAgarState(local));
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
      send(roomCode, "agar:state", serializeAgarState(w));
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
            <p className="text-sm text-muted-foreground">Joining WORLD room</p>
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
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black"
              >
                Retry
              </button>
              <button
                type="button"
                data-testid="agar-connect-back"
                onClick={() => {
                  window.location.href = "/games/agar";
                }}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold"
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
              <span data-testid="agar-mp-role">{isHost ? "HOST" : "SYNC"}</span>
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
                        return (
                          <div
                            key={`${p.id}-${i}`}
                            className="absolute flex items-center justify-center rounded-full border border-white/20 text-[9px] font-semibold text-white/90"
                            style={{
                              left: c.x - r,
                              top: c.y - r,
                              width: r * 2,
                              height: r * 2,
                              backgroundColor: p.color,
                              boxShadow: p.id === deviceId ? `0 0 12px ${p.color}` : undefined,
                              zIndex: Math.round(c.mass),
                            }}
                            title={p.nickname}
                          >
                            {r > 14 ? p.nickname.slice(0, 6) : null}
                          </div>
                        );
                      })
                    : null
                )}
              </div>

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
              <div
                data-testid="agar-game-over"
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/95 p-6"
              >
                <StandardGameOverOverlay
                  gameSlug="agar"
                  score={Math.max(mass, me?.score ?? 0)}
                  onRestart={handleRetry}
                  onRetry={handleRetry}
                  onExit={exitToDetail}
                />
                <button
                  type="button"
                  data-testid="mp-death-play-another"
                  onClick={() => {
                    leaveRoom(roomCode);
                    window.location.href = "/games";
                  }}
                  className="relative z-30 w-full max-w-sm rounded-xl border border-white/25 bg-white/5 py-3 text-sm font-semibold"
                >
                  PLAY ANOTHER GAME
                </button>
              </div>
            ) : null}
          </div>
        </MultiplayerPlayShell>
      )}
    </div>
  );
}
