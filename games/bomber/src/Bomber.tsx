"use client";

/** BOMBER-ONLINE-004 — strict MP join: room → playerId → seat → spawn → stateAck → start. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDeviceId,
  getLastNickname,
  MobileControlPad,
  MP_PLAYER_COLORS,
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
import { BomberGameOver } from "./bomber-game-over";
import { BomberMissionHud } from "./bomber-mission-hud";
import {
  buildMissionList,
  createSessionStats,
  saveBestRecord,
  syncMissionComplete,
  type BomberBestRecord,
  type BomberMissionProgress,
  type BomberRunSummary,
} from "./bomber-retention";
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
import type { GameRoom } from "@game-platform/shared";

import {
  BOMBER_FIRE_START,
  BOMBER_TICK_MS,
  MAP_LETTERS,
  MAP_NAMES,
  applyBomberSyncState,
  bomberRoomCodeForMap,
  createBomberWorld,
  firePowerOf,
  getBombDangerCells,
  plantBomb,
  powerUpEmoji,
  reconcileHumans,
  remainingTimeSec,
  restartSoloMatch,
  rosterForMap,
  serializeBomberState,
  tickBomberWorld,
  bomberPadRepeatMs,
  tryMove,
  upsertRemoteBomb,
  type Bomb,
  type BomberSyncState,
  type BomberWorld,
  type HumanSeat,
} from "./bomber-engine";

const CELL = 26;
/** Map shard rooms (BOMBER-A..D) reuse Supabase rows — reclaim when sim is stale. */
const SHARD_STATE_STALE_MS = 4000;

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
    coins: w.coins.slice(),
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
    list = [
      ...list.filter((h) => h.id === hostId),
      ...list.filter((h) => h.id !== hostId),
    ];
  }
  return list;
}

function isRoomHost(roomCode: string, deviceId: string): boolean {
  const room = getRoom(roomCode);
  if (!room) return false;
  return room.hostId === deviceId;
}

/** Fresh match when invite guest arrives after a solo host win/end. */
function restartInviteMatch(
  w: BomberWorld,
  deviceId: string,
  nickname: string,
  color: string,
  hostId: string,
  humans: HumanSeat[]
): BomberWorld {
  const slots = rosterForMap(w.mapId);
  const next = createBomberWorld(deviceId, nickname, {
    playerSlots: slots,
    mapId: w.mapId,
    humans,
    matchStartedAt: Date.now(),
  });
  reconcileHumans(next, humans, { hostId });
  for (const h of humans) {
    const p = next.players[h.id];
    if (p && !p.isBot) {
      p.alive = true;
      p.bombsLeft = p.bombsMax;
    }
  }
  applyLocalLook(next, deviceId, color);
  return next;
}

function roomHasOtherHumans(room: GameRoom, deviceId: string): boolean {
  return room.players.some((p) => p.deviceId !== deviceId);
}

function isSoloSession(code: string, deviceId: string): boolean {
  const room = getRoom(code);
  return !room || !roomHasOtherHumans(room, deviceId);
}

type BomberPopup = {
  id: number;
  sx: number;
  sy: number;
  text: string;
  color: string;
  until: number;
};

/** Bootstrap map shard room when missing (host-only). */
async function ensureJoinedRoom(code: string, nickname: string): Promise<GameRoom | null> {
  await ensureRoom(code);
  let room = getRoom(code);
  if (room?.players.some((p) => p.deviceId === getDeviceId())) return room;
  room = joinRoom(code, { nickname }) ?? room;
  if (room) return room;
  for (let i = 0; i < 20; i++) {
    room = await joinRoomAsync(code, { nickname });
    if (room) return room;
    await new Promise((r) => window.setTimeout(r, 250));
  }
  return getRoom(code);
}

function localPlayerInState(state: BomberSyncState, deviceId: string): boolean {
  return state.players.some((p) => p.id === deviceId && !p.isBot);
}

function shardStateAgeMs(room: GameRoom | null | undefined): number {
  const updatedAt = room?.gameState?._updatedAt;
  if (!updatedAt) return Number.POSITIVE_INFINITY;
  const ts = new Date(String(updatedAt)).getTime();
  return Number.isFinite(ts) ? Date.now() - ts : Number.POSITIVE_INFINITY;
}

/** Reset stale map shard so the entering device becomes authoritative host (no ghost host). */
function claimStaleShardRoom(room: GameRoom, nickname: string): GameRoom {
  return createRoom({
    code: room.code,
    gameSlug: "bomber",
    maxPlayers: 8,
    matchMode: "public",
    hostNickname: nickname,
  });
}

function shardHasFreshState(code: string): boolean {
  const room = getRoom(code);
  return !!room?.gameState?.state && shardStateAgeMs(room) < SHARD_STATE_STALE_MS;
}

/** Wait for Realtime state broadcast — Postgres omits ephemeral sim blobs. */
async function waitForFreshShardState(code: string, timeoutMs = 3500): Promise<boolean> {
  if (shardHasFreshState(code)) return true;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      unsub();
      window.clearInterval(poll);
      resolve(ok);
    };
    const deadline = Date.now() + timeoutMs;
    const unsub = subscribeRoom(code, () => {
      if (shardHasFreshState(code)) finish(true);
    });
    const poll = window.setInterval(() => {
      sync(code);
      if (shardHasFreshState(code)) finish(true);
      if (Date.now() > deadline) finish(false);
    }, 100);
  });
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
  const qaLocalProbeRef = useRef(false);
  const qaFreshShardRef = useRef(false);
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    qaLocalProbeRef.current = params.get("mp_qa_local") === "1";
    qaFreshShardRef.current = params.get("mp_qa_fresh") === "1";
  }
  const [world, setWorld] = useState<BomberWorld>(() =>
    createBomberWorld(deviceId, nickname, { mapId: 0 })
  );
  const worldRef = useRef(world);
  worldRef.current = world;
  const [lobbyPhase, setLobbyPhase] = useState<LobbyPhase>("entry");
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(false);
  const [stateAck, setStateAck] = useState(false);
  const stateAckRef = useRef(false);
  const setStateAckReady = useCallback((ready: boolean) => {
    stateAckRef.current = ready;
    setStateAck(ready);
  }, []);
  const [styleId, setStyleId] = useState(BOMBER_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const [mapId, setMapId] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [popups, setPopups] = useState<BomberPopup[]>([]);
  const popupIdRef = useRef(0);
  const prevTickRef = useRef(0);
  const [plantFlashUntil, setPlantFlashUntil] = useState(0);
  const [shakeUntil, setShakeUntil] = useState(0);
  const sessionStatsRef = useRef(createSessionStats());
  const [deathSummary, setDeathSummary] = useState<{
    run: BomberRunSummary;
    missions: BomberMissionProgress[];
    bestRecord: BomberBestRecord;
    title: string;
  } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const isHostRef = useRef(false);
  const setHostAuthority = useCallback((host: boolean) => {
    isHostRef.current = host;
    setIsHost(host);
  }, []);
  const reportedRef = useRef(false);
  const pendingInputs = useRef<BomberInput[]>([]);
  const lastGuestInputAt = useRef<Record<string, number>>({});
  const lastStateSent = useRef(0);
  const lastHostStateAt = useRef(0);
  const matchLocalStartAt = useRef(0);
  /** Host that started this match — survives erroneous hostId churn from stale shard reclaim. */
  const matchHostIdRef = useRef<string | null>(null);
  const rosterKeyRef = useRef("");
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
        await ensureJoinedRoom(code, nickname);
        if (!mounted) return;
        const room = getRoom(code);
        if (room && !started && !stateAckRef.current) {
          setHostAuthority(room.hostId === deviceId);
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
  const score = me?.score ?? 0;
  const rank = localRank(world, deviceId);
  const soloSession = isSoloSession(activeRoom, deviceId);
  const onlyLocalHuman = !Object.values(world.players).some(
    (p) => !p.isBot && p.id !== deviceId
  );

  const liveMissions = useMemo(() => {
    const stats = sessionStatsRef.current;
    stats.enemiesDefeated = Math.max(stats.enemiesDefeated, kills);
    stats.peakScore = Math.max(stats.peakScore, score);
    return buildMissionList(stats);
  }, [world.tick, kills, score]);

  useEffect(() => {
    if (world.tick === prevTickRef.current) return;
    prevTickRef.current = world.tick;
    const fb = me?.feedback;
    if (!fb) return;
    const sx = fb.x * CELL + CELL / 2;
    const sy = fb.y * CELL;
    const id = popupIdRef.current++;
    const now = Date.now();
    const stats = sessionStatsRef.current;
    if (fb.kind === "plant") {
      setPlantFlashUntil(now + 220);
      return;
    }
    if (fb.kind === "block") stats.blocksDestroyed += 1;
    if (fb.kind === "kill") stats.enemiesDefeated += 1;
    if (fb.kind === "item") stats.itemsCollected += 1;
    if (fb.kind === "chain") stats.bestChain = Math.max(stats.bestChain, fb.amount);
    if (me) stats.peakScore = Math.max(stats.peakScore, me.score ?? 0);

    if (fb.kind === "blast" || fb.kind === "chain") {
      setShakeUntil(now + (fb.kind === "chain" ? 280 : 180));
    }

    const label =
      fb.kind === "block"
        ? `+${fb.amount}`
        : fb.kind === "coin"
          ? `+${fb.amount} 🪙`
          : fb.kind === "kill"
            ? `+${fb.amount} KILL`
            : fb.kind === "chain"
              ? `CHAIN x${fb.amount}`
              : fb.kind === "item"
                ? "ITEM!"
                : fb.kind === "blast"
                  ? "💥"
                  : `+${fb.amount}`;
    const color =
      fb.kind === "kill"
        ? "#fbbf24"
        : fb.kind === "coin"
          ? "#fde047"
          : fb.kind === "chain"
            ? "#fb923c"
            : fb.kind === "item"
              ? "#a78bfa"
              : fb.kind === "blast"
                ? "#fb923c"
                : "#86efac";
    setPopups((p) => [
      ...p,
      {
        id,
        sx,
        sy,
        text: label,
        color,
        until: now + (fb.kind === "blast" || fb.kind === "chain" ? 720 : 650),
      },
    ]);
  }, [world.tick, me?.feedback, me?.score]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setPopups((p) => (p.some((x) => x.until <= now) ? p.filter((x) => x.until > now) : p));
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  // Authoritative tick: host, or takeover if host state goes stale (fixes frozen AI/bombs)
  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const code = roomRef.current;
      const room = getRoom(code);
      const listedHost = room?.hostId === deviceId;
      const w = worldRef.current;
      const hostNow =
        qaLocalProbeRef.current ||
        listedHost ||
        matchHostIdRef.current === deviceId;
      isHostRef.current = hostNow;
      setIsHost(hostNow);

      if (hostNow) {
        sync(code);
        let humans = collectHumans(code, deviceId, nickname, color);
        if (!humans.some((h) => h.id === deviceId)) {
          humans = [{ id: deviceId, nickname, color }, ...humans];
        }
        const roomNow = getRoom(code);
        const deferMatchEnd = (roomNow?.players.length ?? 1) < 2;
        const humanSeats = humans.filter((h) => {
          const p = w.players[h.id];
          return p && !p.isBot;
        }).length;
        const skipBots = qaFreshShardRef.current && humanSeats >= 2;
        if (w.matchOver && humans.length >= 2) {
          const hostId = matchHostIdRef.current ?? deviceId;
          const next = restartInviteMatch(w, deviceId, nickname, color, hostId, humans);
          worldRef.current = next;
          setWorld(next);
          send(code, "state", serializeBomberState(next));
          return;
        }
        reconcileHumans(w, humans, { hostId: matchHostIdRef.current ?? deviceId });

        const applyInput = (inp: BomberInput) => {
          if (!inp.deviceId) return;
          const at = inp.at ?? 0;
          if (at <= (lastGuestInputAt.current[inp.deviceId] ?? 0)) return;
          lastGuestInputAt.current[inp.deviceId] = at;
          if (inp.dx || inp.dy) tryMove(w, inp.deviceId, inp.dx ?? 0, inp.dy ?? 0);
          if (inp.plant) {
            const bomb = plantBomb(w, inp.deviceId, inp.at ?? Date.now());
            if (bomb) send(code, "bomber:bomb", bomb);
          }
        };

        const gsInputs = room?.gameState ?? {};
        for (const key of Object.keys(gsInputs)) {
          if (!key.startsWith("input:")) continue;
          const payload = gsInputs[key] as BomberInput | undefined;
          if (payload) applyInput(payload);
        }

        const queued = pendingInputs.current.splice(0);
        for (const inp of queued) applyInput(inp);
        tickBomberWorld(w, Date.now(), { deferMatchEnd, skipBots });
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        setNowTick(Date.now());
        // Broadcast every authoritative tick so guest sees movement/death without 80ms lag.
        lastStateSent.current = Date.now();
        send(code, "state", serializeBomberState(next));
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
      const listedHost =
        amHost || isRoomHost(code, deviceId) || matchHostIdRef.current === deviceId;

      const rosterKey = room.players
        .map((p) => p.deviceId)
        .sort()
        .join("|");
      if (listedHost && !qaLocalProbeRef.current && rosterKey !== rosterKeyRef.current) {
        rosterKeyRef.current = rosterKey;
        const w = worldRef.current;
        const humans = collectHumans(code, deviceId, nickname, color);
        if (w.matchOver && humans.length >= 2) {
          const next = restartInviteMatch(
            w,
            deviceId,
            nickname,
            color,
            matchHostIdRef.current ?? hostId ?? deviceId,
            humans
          );
          worldRef.current = next;
          setWorld(next);
          send(code, "state", serializeBomberState(next));
          return;
        }
        reconcileHumans(w, humans, { hostId: matchHostIdRef.current ?? hostId ?? deviceId });
        // Mid-match roster churn must not revive dead humans (MP-CTO-020 death sync).
        if (!w.matchStartedAt || w.matchOver) {
          for (const h of humans) {
            const p = w.players[h.id];
            if (p && !p.isBot) {
              p.alive = true;
              p.bombsLeft = p.bombsMax;
            }
          }
          const next = snap(w);
          worldRef.current = next;
          setWorld(next);
        }
      }

      if (last === "state" && gs.state) {
        if (qaLocalProbeRef.current) return;
        const w = worldRef.current;
        const listedHost = amHost || isRoomHost(code, deviceId);
        const ignoreRemote =
          listedHost ||
          matchHostIdRef.current === deviceId ||
          qaLocalProbeRef.current;
        if (ignoreRemote) return;
        const state = gs.state as BomberSyncState;
        if (
          stateAckRef.current &&
          w.players[deviceId] &&
          !localPlayerInState(state, deviceId)
        ) {
          return;
        }
        lastHostStateAt.current = Date.now();
        const applied = applyBomberSyncState(w, state, {
          rejectMissingHumanIds: [deviceId],
          rejectStaleTick: true,
        });
        if (!applied) return;
        applyLocalLook(w, deviceId, color);
        if (localPlayerInState(state, deviceId) || w.players[deviceId]) {
          setStateAckReady(true);
        }
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        return;
      }

      if (
        last.startsWith("input:") &&
        (listedHost || qaLocalProbeRef.current)
      ) {
        const payload = gs[last] as BomberInput | undefined;
        if (payload?.deviceId) {
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
  }, [started, activeRoom, deviceId, color, setStateAckReady]);

  const applyMatchFromState = useCallback(
    (state: BomberSyncState, code: string, requireLocal = false): boolean => {
      if (state.matchOver) return false;
      if (requireLocal && !localPlayerInState(state, deviceId)) return false;
      const humans = collectHumans(code, deviceId, nickname, color);
      const next = createBomberWorld(deviceId, nickname, {
        playerSlots: state.playerSlots,
        mapId: state.mapId,
        humans,
        matchStartedAt: state.matchStartedAt,
      });
      if (!applyBomberSyncState(next, state, { rejectMissingHumanIds: [deviceId] })) return false;
      const room = getRoom(code);
      const hostId = room?.hostId;
      if (hostId) matchHostIdRef.current = hostId;
      reconcileHumans(next, humans, { hostId: hostId ?? deviceId });
      for (const h of humans) {
        const p = next.players[h.id];
        if (p && !p.isBot) {
          p.alive = true;
          p.bombsLeft = p.bombsMax;
        }
      }
      applyLocalLook(next, deviceId, color);
      worldRef.current = next;
      setWorld(next);
      lastHostStateAt.current = Date.now();
      setStateAckReady(true);
      return true;
    },
    [deviceId, nickname, color, setStateAckReady]
  );

  /** Guest: block until host state assigns distinct seat + playerId. */
  const waitForHostStateAck = useCallback(
    (code: string, expectedMapId: number, timeoutMs = 8000): Promise<boolean> =>
      new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;

        const tryAck = (state: BomberSyncState | undefined): boolean => {
          if (!state || state.mapId !== expectedMapId || state.matchOver) return false;
          if (!localPlayerInState(state, deviceId)) return false;
          if (applyMatchFromState(state, code, true)) {
            setStarted(true);
            setHostAuthority(false);
            matchLocalStartAt.current = Date.now();
            return true;
          }
          return false;
        };

        const room = getRoom(code);
        const existing = room?.gameState?.state as BomberSyncState | undefined;
        if (tryAck(existing)) {
          resolve(true);
          return;
        }

        const unsub = subscribeRoom(code, (r) => {
          const gs = r.gameState ?? {};
          if (gs._lastEvent === "state" && gs.state && tryAck(gs.state as BomberSyncState)) {
            unsub();
            window.clearInterval(poll);
            resolve(true);
          }
        });

        const poll = window.setInterval(() => {
          if (Date.now() > deadline) {
            window.clearInterval(poll);
            unsub();
            resolve(false);
            return;
          }
          sync(code);
          const r = getRoom(code);
          const st = r?.gameState?.state as BomberSyncState | undefined;
          if (tryAck(st)) {
            window.clearInterval(poll);
            unsub();
            resolve(true);
          }
        }, 100);
      }),
    [deviceId, applyMatchFromState, setHostAuthority]
  );

  useEffect(() => {
    if (!started || reportedRef.current) return;
    if (!world.matchOver) return;
    reportedRef.current = true;
    void reportScore("bomber", wins);
  }, [started, world.matchOver, wins, reportScore]);

  const pushInput = useCallback(
    (partial: Omit<BomberInput, "deviceId">) => {
      if (!qaLocalProbeRef.current && !stateAckRef.current) return;
      const code = roomRef.current;
      const payload: BomberInput = { deviceId, ...partial, at: Date.now() };
      const room = getRoom(code);
      const hostNow =
        qaLocalProbeRef.current ||
        matchHostIdRef.current === deviceId ||
        room?.hostId === deviceId;

      send(code, `input:${deviceId}`, payload);

      if (hostNow) {
        const w = worldRef.current;
        const at = payload.at ?? 0;
        if (at > (lastGuestInputAt.current[deviceId] ?? 0)) {
          lastGuestInputAt.current[deviceId] = at;
          if (partial.dx || partial.dy) tryMove(w, deviceId, partial.dx ?? 0, partial.dy ?? 0);
          if (partial.plant) {
            const bomb = plantBomb(w, deviceId, payload.at);
            if (bomb) send(code, "bomber:bomb", bomb);
          }
        }
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        send(code, "state", serializeBomberState(next));
        sync(code);
        return;
      }

      sync(code);
    },
    [deviceId]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & {
      __BOMBER_QA__?: () => {
        roomId: string;
        deviceId: string;
        stateAck: boolean;
        isHost: boolean;
        local: { x: number; y: number; alive: boolean; speedBonus: number } | null;
        players: Array<{ id: string; x: number; y: number; isBot: boolean; alive: boolean }>;
        bombs: Array<{ id: string; x: number; y: number; ownerId: string }>;
        blasts: number;
        matchOver: boolean;
      };
      __BOMBER_QA_MOVE__?: (dx: number, dy: number) => void;
      __BOMBER_QA_PLANT__?: () => boolean;
      __BOMBER_QA_PLAYER__?: (id: string) => { x: number; y: number; alive: boolean } | null;
      __BOMBER_QA_DIE__?: () => boolean;
    };
    w.__BOMBER_QA__ = () => {
      const wr = worldRef.current;
      const me = wr.players[deviceId];
      return {
        roomId: roomRef.current,
        deviceId,
        stateAck: stateAckRef.current,
        isHost: isHostRef.current,
        local: me
          ? { x: me.x, y: me.y, alive: me.alive, speedBonus: me.speedBonus ?? 0 }
          : null,
        players: Object.values(wr.players).map((p) => ({
          id: p.id,
          x: p.x,
          y: p.y,
          isBot: p.isBot,
          alive: p.alive,
        })),
        bombs: wr.bombs.map((b) => ({ id: b.id, x: b.x, y: b.y, ownerId: b.ownerId })),
        blasts: wr.blasts.length,
        matchOver: !!wr.matchOver,
        tick: wr.tick,
      };
    };
    w.__BOMBER_QA_PLANT__ = () => {
      if (!stateAckRef.current) return false;
      pushInput({ plant: true });
      return worldRef.current.bombs.some((b) => b.ownerId === deviceId);
    };
    w.__BOMBER_QA_PLAYER__ = (id: string) => {
      const p = worldRef.current.players[id];
      return p ? { x: p.x, y: p.y, alive: p.alive } : null;
    };
    w.__BOMBER_QA_DIE__ = () => {
      const wr = worldRef.current;
      const me = wr.players[deviceId];
      if (!me?.alive) return false;
      const finalScore = me.score ?? 0;
      const finalKills = me.kills ?? 0;
      me.alive = false;
      const next = structuredClone(wr);
      worldRef.current = next;
      setWorld(next);
      const stats = sessionStatsRef.current;
      stats.enemiesDefeated = Math.max(stats.enemiesDefeated, finalKills);
      stats.peakScore = Math.max(stats.peakScore, finalScore);
      syncMissionComplete(stats);
      const run: BomberRunSummary = {
        ...stats,
        finalScore,
        finalKills,
      };
      const bestRecord = saveBestRecord(run);
      setDeathSummary({
        run,
        missions: buildMissionList(stats),
        bestRecord,
        title: "Game Over",
      });
      return true;
    };
    return () => {
      delete w.__BOMBER_QA__;
      delete w.__BOMBER_QA_PLANT__;
      delete w.__BOMBER_QA_PLAYER__;
      delete w.__BOMBER_QA_DIE__;
    };
  }, [deviceId, pushInput]);

  useEffect(() => {
    if (!started || (!stateAck && !qaLocalProbeRef.current)) return;
    const w = window as Window & { __BOMBER_QA_MOVE__?: (dx: number, dy: number) => void };
    w.__BOMBER_QA_MOVE__ = (dx, dy) => pushInput({ dx, dy });
    return () => {
      delete w.__BOMBER_QA_MOVE__;
    };
  }, [started, stateAck, pushInput]);

  useEffect(() => {
    if (!started || (!stateAck && !qaLocalProbeRef.current)) return;
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
  }, [started, stateAck, pushInput]);

  /** Map select → join room → host creates world / guest waits for stateAck (no local fallback). */
  const enterMapMatch = useCallback(
    (nextMapId: number) => {
      if (started && stateAckRef.current) return;
      reportedRef.current = false;
      setStateAckReady(false);
      setConnectError(false);
      setConnecting(true);
      setStarted(false);
      setMapId(nextMapId);
      const code = bomberRoomCodeForMap(nextMapId);
      setActiveRoom(code);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("room", code);
        window.history.replaceState({}, "", url.toString());
      }

      void (async () => {
        try {
          let room: GameRoom | null = null;
          try {
            room = await ensureJoinedRoom(code, nickname);
          } catch {
            /* retry below */
          }

          if (!room && !qaLocalProbeRef.current) {
            for (let i = 0; i < 24; i++) {
              await ensureRoom(code);
              room = getRoom(code);
              if (room?.players.some((p) => p.deviceId === deviceId)) break;
              room = (await joinRoomAsync(code, { nickname })) ?? room;
              if (room?.players.some((p) => p.deviceId === deviceId)) break;
              await new Promise((r) => window.setTimeout(r, 250));
            }
          }

          if (!room && qaLocalProbeRef.current) {
            room = createRoom({
              code,
              gameSlug: "bomber",
              maxPlayers: 8,
              matchMode: "public",
              hostNickname: nickname,
            });
          }

          if (!room && !qaLocalProbeRef.current) {
            for (let i = 0; i < 48; i++) {
              sync(code);
              room = getRoom(code);
              if (room?.players.length) break;
              await new Promise((r) => window.setTimeout(r, 250));
            }
            if (!room) {
              const fetched = await ensureRoom(code);
              if (!fetched && qaFreshShardRef.current) {
                room = createRoom({
                  code,
                  gameSlug: "bomber",
                  maxPlayers: 8,
                  matchMode: "public",
                  hostNickname: nickname,
                });
              } else {
                room =
                  (await joinRoomAsync(code, { nickname })) ??
                  joinRoom(code, { nickname }) ??
                  fetched;
              }
            } else {
              room =
                joinRoom(code, { nickname }) ??
                (await joinRoomAsync(code, { nickname })) ??
                room;
            }
          }

          if (!room) {
            setConnecting(false);
            setConnectError(true);
            return;
          }

          let joinedRoom: GameRoom = room;
          let reclaimedShard = false;
          const othersInRoom = !qaLocalProbeRef.current && roomHasOtherHumans(joinedRoom, deviceId);
          if (qaFreshShardRef.current && !othersInRoom) {
            joinedRoom = claimStaleShardRoom(joinedRoom, nickname);
            reclaimedShard = true;
            // Supabase deleteRoom is async — brief pause before guest joins stale shard.
            await new Promise((r) => window.setTimeout(r, 2000));
          }
          let freshState = true;
          if (!qaLocalProbeRef.current) {
            freshState = await waitForFreshShardState(
              code,
              othersInRoom ? 12_000 : 3500
            );
            if (qaFreshShardRef.current) {
              const gs0 = joinedRoom.gameState?.state as BomberSyncState | undefined;
              const simHost = gs0?.players?.find(
                (p) => p.id === joinedRoom.hostId && !p.isBot
              );
              const simHostAlive = !!simHost?.alive;
              const hostPresent =
                freshState &&
                joinedRoom.players.some((p) => p.deviceId === joinedRoom.hostId) &&
                simHostAlive;
              if (!hostPresent) {
                joinedRoom = claimStaleShardRoom(joinedRoom, nickname);
                reclaimedShard = true;
                freshState = false;
              }
            }
          }
          room = joinedRoom;

          const amHost =
            qaLocalProbeRef.current ||
            matchHostIdRef.current === deviceId ||
            room.hostId === deviceId;
          setHostAuthority(amHost);

          if (!amHost) {
            const acked = await waitForHostStateAck(code, nextMapId, 20_000);
            setConnecting(false);
            if (!acked) {
              setConnectError(true);
              setStarted(false);
              setStateAckReady(false);
            }
            return;
          }

          const gs = room.gameState ?? {};
          const existing = gs.state as BomberSyncState | undefined;
          const slots = rosterForMap(nextMapId);
          const matchStartedAt = Date.now();

          const selfAlive =
            existing?.players?.some(
              (p) => p.id === deviceId && !p.isBot && p.alive
            ) ?? false;
          if (
            existing &&
            !reclaimedShard &&
            !qaFreshShardRef.current &&
            selfAlive &&
            existing.mapId === nextMapId &&
            !existing.matchOver &&
            !qaLocalProbeRef.current
          ) {
            const humans = collectHumans(code, deviceId, nickname, color);
            const next = createBomberWorld(deviceId, nickname, {
              playerSlots: existing.playerSlots,
              mapId: existing.mapId,
              humans,
              matchStartedAt: existing.matchStartedAt,
            });
            if (!applyBomberSyncState(next, existing, { rejectMissingHumanIds: [deviceId] })) {
              setConnecting(false);
              setConnectError(true);
              return;
            }
            applyLocalLook(next, deviceId, color);
            reconcileHumans(next, humans, { hostId: deviceId });
            for (const h of humans) {
              const p = next.players[h.id];
              if (p && !p.isBot) {
                p.alive = true;
                p.bombsLeft = p.bombsMax;
              }
            }
            applyLocalLook(next, deviceId, color);
            if (!next.players[deviceId]) {
              setConnecting(false);
              setConnectError(true);
              return;
            }
            matchHostIdRef.current = deviceId;
            worldRef.current = next;
            setWorld(next);
            matchLocalStartAt.current = Date.now();
            setStarted(true);
            setStateAckReady(true);
            setHostAuthority(true);
            setConnecting(false);
            send(code, "state", serializeBomberState(next));
            return;
          }

          const humans = collectHumans(code, deviceId, nickname, color);
          const next = createBomberWorld(deviceId, nickname, {
            playerSlots: slots,
            mapId: nextMapId,
            humans,
            matchStartedAt,
          });
          reconcileHumans(next, humans, { hostId: deviceId });
          for (const h of humans) {
            const p = next.players[h.id];
            if (p && !p.isBot) {
              p.alive = true;
              p.bombsLeft = p.bombsMax;
            }
          }
          applyLocalLook(next, deviceId, color);
          if (!next.players[deviceId]) {
            setConnecting(false);
            setConnectError(true);
            return;
          }
          matchHostIdRef.current = deviceId;
          worldRef.current = next;
          setWorld(next);
          matchLocalStartAt.current = Date.now();
          setStarted(true);
          setStateAckReady(true);
          setConnecting(false);
          setHostAuthority(true);
          send(code, "bomber:cfg", {
            playerSlots: slots,
            mapId: nextMapId,
            matchStartedAt,
            hostId: deviceId,
          });
          send(code, "state", serializeBomberState(next));
        } catch {
          setConnecting(false);
          setConnectError(true);
          setStarted(false);
          setStateAckReady(false);
        }
      })();
    },
    [
      deviceId,
      nickname,
      color,
      started,
      waitForHostStateAck,
      setHostAuthority,
      setStateAckReady,
    ]
  );

  const handleEntryDone = useCallback(() => {
    setLobbyPhase("map");
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("room")?.toUpperCase();
    if (!q?.startsWith("BOMBER-")) return;
    const letter = q.slice("BOMBER-".length);
    const idx = MAP_LETTERS.indexOf(letter as (typeof MAP_LETTERS)[number]);
    if (idx >= 0 && !started) {
      window.setTimeout(() => enterMapMatch(idx), 0);
    }
  }, [enterMapMatch, started]);

  const handleRetry = useCallback(() => {
    reportedRef.current = false;
    const code = roomRef.current;
    const soloRetry =
      isSoloSession(code, deviceId) ||
      qaLocalProbeRef.current ||
      !Object.values(worldRef.current.players).some((p) => !p.isBot && p.id !== deviceId);
    if (soloRetry && started) {
      setPopups([]);
      sessionStatsRef.current = createSessionStats();
      setDeathSummary(null);
      const next = restartSoloMatch(worldRef.current, deviceId, nickname, color);
      applyLocalLook(next, deviceId, color);
      worldRef.current = next;
      setWorld(next);
      setNowTick(Date.now());
      if (isHostRef.current || qaLocalProbeRef.current) {
        send(code, "state", serializeBomberState(next));
      }
      return;
    }
    setStateAckReady(false);
    setStarted(false);
    setConnecting(false);
    setConnectError(false);
    setLobbyPhase("map");
  }, [deviceId, nickname, color, started, setStateAckReady]);

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
  const dangerCells = getBombDangerCells(world, nowTick);
  const showDeath =
    world.matchOver ||
    (!alive &&
      started &&
      stateAck &&
      (soloSession || qaLocalProbeRef.current || onlyLocalHuman));
  const resultLabel = world.isDraw
    ? "DRAW"
    : world.winnerId === deviceId
      ? "WIN"
      : "LOSE";

  const deathReportedRef = useRef(false);

  useEffect(() => {
    if (!showDeath) {
      deathReportedRef.current = false;
      return;
    }
    if (deathReportedRef.current) return;
    deathReportedRef.current = true;
    const stats = sessionStatsRef.current;
    stats.enemiesDefeated = Math.max(stats.enemiesDefeated, kills);
    stats.peakScore = Math.max(stats.peakScore, score);
    syncMissionComplete(stats);
    const run: BomberRunSummary = {
      ...stats,
      finalScore: score,
      finalKills: kills,
    };
    const bestRecord = saveBestRecord(run);
    setDeathSummary({
      run,
      missions: buildMissionList(stats),
      bestRecord,
      title: world.matchOver ? resultLabel : "Game Over",
    });
  }, [showDeath, world.matchOver, score, kills, resultLabel]);

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
        className="flex min-h-[70vh] touch-none select-none flex-col items-center justify-center gap-5 bg-slate-950 px-4 text-white"
        style={{ WebkitUserSelect: "none", userSelect: "none", touchAction: "none" }}
      >
        <h1 className="text-2xl font-bold">Map Select</h1>
        <p className="text-sm text-white/60">Same map = same room · AI fills empty seats</p>
        {connecting ? (
          <div
            data-testid="bomber-connecting"
            className="flex flex-col items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-8 py-6"
          >
            <p className="text-lg font-semibold">Connecting…</p>
            <p className="text-sm text-white/60">Waiting for room · seat · spawn</p>
          </div>
        ) : connectError ? (
          <div
            data-testid="bomber-connect-error"
            className="flex flex-col items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/40 px-8 py-6"
          >
            <p className="text-lg font-semibold text-red-200">Connection failed</p>
            <button
              type="button"
              data-testid="bomber-connect-retry"
              onClick={() => enterMapMatch(mapId)}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
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

  return (
    <>
      <MultiplayerPlayShell
        onExit={exitToDetail}
        inputActive={started && stateAck && alive}
        sideHud={rankHud}
        topBar={
          <MultiplayerYouBar
            metric={`S:${score} · K:${kills}`}
            rank={rank}
            extra={
              <>
                <span
                  data-testid="bomber-score-hud"
                  className="touch-none select-none rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100"
                >
                  SCORE {score}
                </span>
                <span
                  data-testid="bomber-match-hud"
                  className="touch-none select-none rounded-md bg-black/55 px-2.5 py-1 tabular-nums"
                  style={{ WebkitUserSelect: "none", userSelect: "none" }}
                >
                  {world.playerSlots}P · {MAP_LETTERS[world.mapId % 4]} {MAP_NAMES[world.mapId % 4]}
                </span>
                <span
                  data-testid="bomber-room-hud"
                  className="touch-none select-none rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/80"
                  style={{ WebkitUserSelect: "none", userSelect: "none" }}
                >
                  {activeRoom}
                </span>
                <span
                  data-testid="bomber-fire-hud"
                  className="touch-none select-none rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/80"
                  style={{ WebkitUserSelect: "none", userSelect: "none" }}
                >
                  FIRE {me ? firePowerOf(me) : BOMBER_FIRE_START}/{world.maxFire}
                </span>
                <span
                  data-testid="bomber-sd-hud"
                  className="touch-none select-none rounded-md bg-black/55 px-2.5 py-1 tabular-nums"
                  style={{ WebkitUserSelect: "none", userSelect: "none" }}
                >
                  {world.suddenDeathActive
                    ? `SD R${world.suddenDeathRing}`
                    : `SD ${timeLeft}s`}
                </span>
                <span
                  data-testid="bomber-input-ready"
                  data-ready={stateAck ? "1" : "0"}
                  className="touch-none select-none rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/70"
                  style={{ WebkitUserSelect: "none", userSelect: "none" }}
                >
                  {stateAck ? (alive ? "❤️" : "🖤") : "⏳"} · {isHost ? "HOST" : "SYNC"}
                </span>
              </>
            }
          />
        }
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="overflow-hidden"
            style={{
              width,
              height,
              background: "#0f172a",
              transform:
                Date.now() < shakeUntil
                  ? `translate(${(Math.sin(Date.now() / 40) * 2).toFixed(1)}px, ${(Math.cos(Date.now() / 35) * 2).toFixed(1)}px)`
                  : undefined,
            }}
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
          {dangerCells.map((c) => (
            <div
              key={`danger-${c.x}-${c.y}`}
              data-testid="bomber-danger-cell"
              className="pointer-events-none absolute"
              style={{
                left: c.x * CELL,
                top: c.y * CELL,
                width: CELL - 1,
                height: CELL - 1,
                backgroundColor: "rgba(239,68,68,0.28)",
                border: "1px dashed rgba(248,113,113,0.75)",
                boxShadow: "inset 0 0 8px rgba(239,68,68,0.25)",
                zIndex: 4,
              }}
            />
          ))}
          {world.blasts.flatMap((bl) =>
            bl.cells.map((c, i) => (
              <div
                key={`${bl.id}-${i}`}
                className="absolute"
                style={{
                  left: c.x * CELL,
                  top: c.y * CELL,
                  width: CELL - 1,
                  height: CELL - 1,
                  background: "linear-gradient(135deg, #fef08a 0%, #fb923c 55%, #ef4444 100%)",
                  boxShadow: "0 0 10px rgba(251,146,60,0.85)",
                  opacity: 0.92,
                  zIndex: 6,
                }}
              />
            ))
          )}
          {world.coins.map((coin) => (
            <div
              key={coin.id}
              data-testid="bomber-coin"
              className="absolute z-10 flex items-center justify-center text-sm"
              style={{
                left: coin.x * CELL + 4,
                top: coin.y * CELL + 4,
                width: CELL - 8,
                height: CELL - 8,
              }}
              title="Coin"
            >
              🪙
            </div>
          ))}
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
                data-player-id={p.id}
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
            const urgent = fuseLeft / fuseMs < 0.55;
            const critical = fuseLeft / fuseMs < 0.25;
            return (
              <div
                key={b.id}
                data-testid="bomber-bomb"
                className={`absolute z-30 flex items-center justify-center rounded-full border-2 ${
                  critical
                    ? "animate-pulse border-red-500 bg-red-100"
                    : urgent
                      ? "animate-pulse border-red-400 bg-amber-100"
                      : "border-zinc-400 bg-zinc-200"
                }`}
                style={{
                  left: b.x * CELL + 4,
                  top: b.y * CELL + 4,
                  width: CELL - 8,
                  height: CELL - 8,
                  boxShadow: critical
                    ? "0 0 16px rgba(239,68,68,1)"
                    : urgent
                      ? "0 0 12px rgba(248,113,113,0.95)"
                      : Date.now() < plantFlashUntil
                        ? "0 0 14px rgba(250,204,21,0.95)"
                        : "0 0 6px rgba(255,255,255,0.5)",
                }}
              >
                <span className="text-xs">💣</span>
                {urgent ? (
                  <span
                    className={`absolute -top-2 rounded px-1 text-[9px] font-bold text-white ${
                      critical ? "bg-red-700 animate-pulse" : "bg-red-600"
                    }`}
                  >
                    {Math.ceil(fuseLeft / 1000)}
                  </span>
                ) : null}
              </div>
            );
          })}
          {popups.map((pop) => (
            <div
              key={pop.id}
              className="pointer-events-none absolute z-40 text-xs font-bold"
              style={{
                left: pop.sx,
                top: pop.sy - 10,
                color: pop.color,
                textShadow: "0 1px 4px rgba(0,0,0,0.85)",
              }}
            >
              {pop.text}
            </div>
          ))}
          {!alive && !world.matchOver && !soloSession ? (
            <div className="absolute inset-x-0 bottom-4 z-20 text-center text-xs text-white/70">
              Spectating · last survivor wins
            </div>
          ) : null}
          </div>
        </div>
      </MultiplayerPlayShell>

      {alive && started && stateAck ? (
        <div className="pointer-events-none fixed left-3 top-24 z-[240] sm:top-20">
          <BomberMissionHud missions={liveMissions} />
        </div>
      ) : null}

      {alive && !world.matchOver && (stateAck || qaLocalProbeRef.current) ? (
        <MobileControlPad
          onDirection={padMove}
          repeatMs={bomberPadRepeatMs(me?.speedBonus ?? 0, me?.speedPenalty ?? 0)}
          actions={[{ id: "bomb", label: "BOMB", mode: "tap", onPress: () => pushInput({ plant: true }) }]}
        />
      ) : null}

      {showDeath && deathSummary ? (
        <BomberGameOver
          finalScore={deathSummary.run.finalScore}
          blocksDestroyed={deathSummary.run.blocksDestroyed}
          enemiesDefeated={deathSummary.run.enemiesDefeated}
          bestChain={deathSummary.run.bestChain}
          missions={deathSummary.missions}
          bestRecord={deathSummary.bestRecord}
          title={deathSummary.title}
          onRetry={handleRetry}
          onPlayAnother={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/games";
            }
          }}
        />
      ) : null}
    </>
  );
}
