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
  type PadDirection,
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
  ARENA_RADIUS,
  MAX_PLAYERS,
  PLAYER_RADIUS,
  PUSH_ARENA_TICK_MS,
  SAFE_ZONE_RADIUS,
  applyPushArenaInput,
  applyPushArenaSyncState,
  createPushArenaWorld,
  reconcileHumans,
  remainingRoundSec,
  restartPushArenaRound,
  serializePushArenaState,
  tickPushArenaWorld,
  type HumanSeat,
  type PushArenaInput,
  type PushArenaSyncState,
  type PushArenaWorld,
  type PushFeedbackKind,
} from "./push-arena-engine";

const VIEW = 600;
const SCALE = VIEW / (ARENA_RADIUS * 2 + 40);

const PUSH_ARENA_STYLES: MpStyleOption[] = [
  { id: "cyan", label: "Cyan", emoji: "🔵", color: MP_PLAYER_COLORS[0] },
  { id: "pink", label: "Pink", emoji: "🩷", color: MP_PLAYER_COLORS[1] },
  { id: "gold", label: "Gold", emoji: "🟡", color: MP_PLAYER_COLORS[2] },
  { id: "green", label: "Green", emoji: "🟢", color: MP_PLAYER_COLORS[3] },
];

function resolveRoomCode(): string {
  if (typeof window === "undefined") return "PUSH-ARENA";
  const q = new URLSearchParams(window.location.search).get("room");
  return (q && q.trim()) || "PUSH-ARENA";
}

function snapWorld(w: PushArenaWorld): PushArenaWorld {
  return {
    tick: w.tick,
    roundStartedAt: w.roundStartedAt,
    roundOver: w.roundOver,
    winnerId: w.winnerId,
    players: Object.fromEntries(Object.entries(w.players).map(([k, p]) => [k, { ...p }])),
    items: w.items.map((i) => ({ ...i })),
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
  return list.slice(0, MAX_PLAYERS);
}

function isRoomHost(code: string, deviceId: string): boolean {
  const room = getRoom(code);
  return room?.hostId === deviceId;
}

function toWorldX(x: number): number {
  return VIEW / 2 + x * SCALE;
}

function toWorldY(y: number): number {
  return VIEW / 2 + y * SCALE;
}

function feedbackLabel(kind: PushFeedbackKind): string {
  if (kind === "push") return "PUSH!";
  if (kind === "knockout") return "KNOCKOUT!";
  if (kind === "boost") return "BOOST!";
  if (kind === "shield") return "SHIELD!";
  return "ITEM!";
}

type Popup = { id: number; sx: number; sy: number; text: string; color: string; until: number };

const BEST_KEY = "play29:push-arena-best";

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(BEST_KEY);
  return v ? Number(v) || 0 : 0;
}

function saveBest(score: number): number {
  const prev = loadBest();
  if (score > prev) {
    localStorage.setItem(BEST_KEY, String(score));
    return score;
  }
  return prev;
}

export function PushArenaGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "You", []);
  const roomCode = useMemo(() => resolveRoomCode(), []);

  const [world, setWorld] = useState<PushArenaWorld>(() =>
    createPushArenaWorld(deviceId, nickname)
  );
  const worldRef = useRef(world);
  worldRef.current = world;

  const [started, setStarted] = useState(false);
  const [styleId, setStyleId] = useState(PUSH_ARENA_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const [isHost, setIsHost] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [popups, setPopups] = useState<Popup[]>([]);
  const [bestRecord, setBestRecord] = useState(loadBest);

  const roomRef = useRef(roomCode);
  roomRef.current = roomCode;
  const isHostRef = useRef(false);
  const pendingInputs = useRef<PushArenaInput[]>([]);
  const lastGuestInputAt = useRef<Record<string, number>>({});
  const lastStateSent = useRef(0);
  const lastHostStateAt = useRef(0);
  const steerRef = useRef({ dx: 0, dy: 0 });
  const boostHeldRef = useRef(false);
  const popupIdRef = useRef(0);
  const prevTickRef = useRef(0);
  const rematchRequestedRef = useRef(false);
  const lastInputsRef = useRef<Record<string, PushArenaInput>>({});

  const me = world.players[deviceId];
  const alive = !!me?.alive;
  const score = Math.round(me?.score ?? 0);
  const knockouts = me?.knockouts ?? 0;
  const rankIdx = world.rankings.findIndex((r) => r.id === deviceId);
  const rank = rankIdx >= 0 ? rankIdx + 1 : 0;
  const timeLeft = remainingRoundSec(world, nowTick);
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await ensureRoom(roomCode);
        let room = await joinRoomAsync(roomCode, {
          nickname,
          gameSlug: "push-arena",
          maxPlayers: 4,
        });
        if (!room && !getRoom(roomCode)) {
          createRoom({
            gameSlug: "push-arena",
            maxPlayers: 4,
            code: roomCode,
            matchMode: "private",
          });
          room = joinRoom(roomCode, { nickname, gameSlug: "push-arena", maxPlayers: 4 });
        }
        if (!mounted) return;
      } catch {
        try {
          if (!getRoom(roomCode)) {
            createRoom({
              gameSlug: "push-arena",
              maxPlayers: 4,
              code: roomCode,
              matchMode: "private",
            });
          }
          joinRoom(roomCode, { nickname, gameSlug: "push-arena", maxPlayers: 4 });
        } catch {
          /* solo fallback */
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
    (partial: Partial<Omit<PushArenaInput, "deviceId" | "at">>) => {
      const code = roomRef.current;
      const payload: PushArenaInput = {
        deviceId,
        dx: partial.dx ?? steerRef.current.dx,
        dy: partial.dy ?? steerRef.current.dy,
        boost: partial.boost ?? boostHeldRef.current,
        push: partial.push,
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

  const applySteerFromKeys = useCallback(
    (dx: number, dy: number) => {
      steerRef.current = { dx, dy };
      pushInput({ dx, dy });
    },
    [pushInput]
  );

  useEffect(() => {
    if (!started || !alive || world.roundOver) return;
    const onKey = (e: KeyboardEvent) => {
      let dx = steerRef.current.dx;
      let dy = steerRef.current.dy;
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
      if (k === "e" || k === "z") {
        pushInput({ push: true });
        return;
      }
      const len = Math.hypot(dx, dy);
      if (len > 0.01) {
        applySteerFromKeys(dx / len, dy / len);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " " || k === "shift") {
        boostHeldRef.current = false;
        pushInput({ boost: false });
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        steerRef.current = { dx: 0, dy: 0 };
        pushInput({ dx: 0, dy: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [started, alive, world.roundOver, applySteerFromKeys, pushInput]);

  const padMove = useCallback(
    (dir: PadDirection) => {
      const map: Record<PadDirection, { dx: number; dy: number }> = {
        up: { dx: 0, dy: -1 },
        down: { dx: 0, dy: 1 },
        left: { dx: -1, dy: 0 },
        right: { dx: 1, dy: 0 },
      };
      const v = map[dir];
      applySteerFromKeys(v.dx, v.dy);
    },
    [applySteerFromKeys]
  );

  const padSteer = useCallback(
    (vx: number, vy: number) => {
      applySteerFromKeys(vx, vy);
    },
    [applySteerFromKeys]
  );

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
          const next = restartPushArenaRound(w, humans);
          for (const h of humans) {
            const p = next.players[h.id];
            if (p && h.color) p.color = h.color;
          }
          worldRef.current = next;
          setWorld(next);
          send(code, "state", serializePushArenaState(next));
          return;
        }

        const applyInp = (inp: PushArenaInput, force = false) => {
          if (!inp.deviceId) return;
          const at = inp.at ?? 0;
          if (!force && at <= (lastGuestInputAt.current[inp.deviceId] ?? 0)) return;
          lastGuestInputAt.current[inp.deviceId] = at;
          applyPushArenaInput(w, inp, Date.now());
        };

        for (const inp of Object.values(lastInputsRef.current)) {
          applyInp({ ...inp, at: Date.now() }, true);
        }

        const gsInputs = room?.gameState ?? {};
        for (const key of Object.keys(gsInputs)) {
          if (!key.startsWith("input:")) continue;
          const payload = gsInputs[key] as PushArenaInput | undefined;
          if (payload) {
            lastInputsRef.current[payload.deviceId] = payload;
            applyInp(payload, true);
          }
        }
        for (const inp of pendingInputs.current.splice(0)) applyInp(inp, true);

        const humanCount = humans.filter((h) => !h.id.startsWith("bot:")).length;
        tickPushArenaWorld(w, Date.now(), { skipBots: humanCount >= 2 });

        const next = snapWorld(w);
        worldRef.current = next;
        setWorld(next);
        setNowTick(Date.now());
        lastStateSent.current = Date.now();
        send(code, "state", serializePushArenaState(next));
      } else {
        setNowTick(Date.now());
      }
    }, PUSH_ARENA_TICK_MS);
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
        const humans = collectHumans(code, deviceId, nickname, color);
        reconcileHumans(w, humans);
      }

      if (last === "push-arena:rematch") {
        rematchRequestedRef.current = true;
        if (amHost) return;
      }

      if (last === "state" && gs.state) {
        if (amHost) return;
        const state = gs.state as PushArenaSyncState;
        lastHostStateAt.current = Date.now();
        const w = worldRef.current;
        applyPushArenaSyncState(w, state, { rejectStaleTick: true });
        const next = snapWorld(w);
        worldRef.current = next;
        setWorld(next);
      }
    });
  }, [started, roomCode, deviceId]);

  useEffect(() => {
    if (world.tick === prevTickRef.current) return;
    prevTickRef.current = world.tick;
    for (const p of Object.values(world.players)) {
      const fb = p.feedback;
      if (!fb) continue;
      const id = popupIdRef.current++;
      const now = Date.now();
      const label = feedbackLabel(fb.kind);
      const colorFb =
        fb.kind === "knockout" ? "#f87171" : fb.kind === "push" ? "#fbbf24" : "#86efac";
      setPopups((prev) => [
        ...prev,
        {
          id,
          sx: toWorldX(fb.x),
          sy: toWorldY(fb.y),
          text: label,
          color: colorFb,
          until: now + 700,
        },
      ]);
    }
  }, [world.tick, world.players]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setPopups((p) => (p.some((x) => x.until <= now) ? p.filter((x) => x.until > now) : p));
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!world.roundOver || !me) return;
    setBestRecord(saveBest(Math.round(me.score)));
  }, [world.roundOver, me?.score]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & {
      __PUSH_ARENA_QA__?: () => {
        tick: number;
        roundOver: boolean;
        deviceId: string;
        isHost: boolean;
        players: Array<{ id: string; x: number; y: number; alive: boolean; isBot?: boolean }>;
        items: number;
      };
      __PUSH_ARENA_QA_INPUT__?: (dx: number, dy: number, opts?: { boost?: boolean; push?: boolean }) => void;
    };
    w.__PUSH_ARENA_QA__ = () => {
      const cur = worldRef.current;
      return {
        tick: cur.tick,
        roundOver: cur.roundOver,
        deviceId,
        isHost: isHostRef.current,
        players: Object.values(cur.players).map((p) => ({
          id: p.id,
          x: Math.round(p.x),
          y: Math.round(p.y),
          alive: p.alive,
          isBot: p.isBot,
        })),
        items: cur.items.length,
      };
    };
    w.__PUSH_ARENA_QA_INPUT__ = (dx, dy, opts) => {
      pushInput({ dx, dy, boost: opts?.boost, push: opts?.push });
    };
  }, [deviceId, pushInput]);

  const onPlay = useCallback(() => {
    const humans = collectHumans(roomCode, deviceId, nickname, color);
    const w = createPushArenaWorld(deviceId, nickname, humans);
    worldRef.current = w;
    setWorld(w);
    setStarted(true);
    if (isRoomHost(roomCode, deviceId) || getRoom(roomCode)?.hostId === deviceId) {
      send(roomCode, "state", serializePushArenaState(w));
    }
  }, [deviceId, nickname, color, roomCode]);

  const onRematch = useCallback(() => {
    rematchRequestedRef.current = true;
    send(roomRef.current, "push-arena:rematch", { at: Date.now() });
    if (isHostRef.current) {
      const humans = collectHumans(roomRef.current, deviceId, nickname, color);
      const next = restartPushArenaRound(worldRef.current, humans);
      rematchRequestedRef.current = false;
      worldRef.current = next;
      setWorld(next);
      send(roomRef.current, "state", serializePushArenaState(next));
    }
  }, [deviceId, nickname, color]);

  const onExit = useCallback(() => {
    window.location.href = "/";
  }, []);

  const playerLabels = Object.values(world.players)
    .slice(0, 4)
    .map((p, i) => ({
      id: p.id,
      label: `P${i + 1}`,
      nickname: p.nickname,
      alive: p.alive,
      score: Math.round(p.score),
      isLocal: p.id === deviceId,
    }));

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Push Arena"
        subtitle="2~4인 · 밀어내기 배틀 · 방 코드로 초대"
        styles={PUSH_ARENA_STYLES}
        styleId={styleId}
        onStyleChange={setStyleId}
        color={color}
        onColorChange={setColor}
        roomCode={roomCode}
        onPlay={onPlay}
        playLabel="ENTER ARENA"
      />
    );
  }

  const survivalSec = me
    ? Math.max(0, Math.round((Date.now() - me.aliveSince) / 1000))
    : 0;

  return (
    <MultiplayerPlayShell
      inputActive={started && alive && !world.roundOver}
      onExit={onExit}
      topBar={
        <div className="flex w-full max-w-xl items-center justify-between gap-2 text-xs text-white/90">
          <span className="font-mono tabular-nums">
            TIME {mm}:{ss}
          </span>
          <span className="truncate opacity-80">
            ROOM {roomCode} {isHost ? "· HOST" : ""}
          </span>
        </div>
      }
      sideHud={
        <MultiplayerSideRankHud
          title="SCORE"
          selfId={deviceId}
          entries={world.rankings.map((r) => ({
            id: r.id,
            label: r.nickname.slice(0, 8),
            value: String(r.score),
          }))}
        />
      }
    >
      <div className="relative mx-auto" style={{ width: VIEW, height: VIEW }}>
        <svg width={VIEW} height={VIEW} className="rounded-xl bg-[#0f172a]">
          <defs>
            <radialGradient id="pa-arena" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0b1220" />
            </radialGradient>
          </defs>
          <circle cx={VIEW / 2} cy={VIEW / 2} r={ARENA_RADIUS * SCALE} fill="url(#pa-arena)" />
          <circle
            cx={VIEW / 2}
            cy={VIEW / 2}
            r={ARENA_RADIUS * SCALE}
            fill="none"
            stroke="#ef4444"
            strokeWidth={3}
            strokeDasharray="8 6"
          />
          <circle
            cx={VIEW / 2}
            cy={VIEW / 2}
            r={SAFE_ZONE_RADIUS * SCALE}
            fill="none"
            stroke="#334155"
            strokeWidth={1}
            opacity={0.6}
          />

          {world.items.map((it) => (
            <g key={it.id} transform={`translate(${toWorldX(it.x)}, ${toWorldY(it.y)})`}>
              <circle r={14} fill="#1e293b" stroke="#64748b" strokeWidth={1} />
              <text textAnchor="middle" dominantBaseline="central" fontSize={16}>
                {it.kind === "boost" ? "⚡" : it.kind === "push" ? "💥" : "🛡️"}
              </text>
            </g>
          ))}

          {Object.values(world.players).map((p) => {
            if (!p.alive && !world.roundOver) return null;
            const cx = toWorldX(p.x);
            const cy = toWorldY(p.y);
            const r = PLAYER_RADIUS * SCALE;
            return (
              <g key={p.id} opacity={p.alive ? 1 : 0.35}>
                {p.shieldUntil > Date.now() ? (
                  <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="#38bdf8" strokeWidth={2} />
                ) : null}
                <circle cx={cx} cy={cy} r={r} fill={p.color} stroke={p.id === deviceId ? "#fff" : "#000"} strokeWidth={p.id === deviceId ? 3 : 1} />
                <text x={cx} y={cy - r - 8} textAnchor="middle" fill="#e2e8f0" fontSize={11}>
                  {p.nickname}
                </text>
              </g>
            );
          })}
        </svg>

        {popups.map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute font-bold"
            style={{
              left: p.sx,
              top: p.sy,
              transform: "translate(-50%, -50%)",
              color: p.color,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              fontSize: p.text.includes("KNOCKOUT") ? 18 : 14,
            }}
          >
            {p.text}
          </div>
        ))}

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {playerLabels.map((pl) => (
            <div
              key={pl.id}
              className={`rounded px-2 py-0.5 text-[10px] font-medium ${pl.isLocal ? "bg-white/20 text-white" : "bg-black/40 text-white/80"}`}
            >
              {pl.label} {pl.nickname} · {pl.score} {pl.alive ? "" : "💀"}
            </div>
          ))}
        </div>
      </div>

      <MultiplayerYouBar metric={`S:${score} · KO:${knockouts}`} rank={rank || undefined} />

      {started && !world.roundOver ? (
        <MobileControlPad
          onSteer={padSteer}
          onDirection={padMove}
          actions={[
            {
              id: "boost",
              label: "BOOST",
              mode: "hold",
              active: boostHeldRef.current || (me?.boostUntil ?? 0) > Date.now(),
              onPress: () => {
                boostHeldRef.current = true;
                pushInput({ boost: true });
              },
              onRelease: () => {
                boostHeldRef.current = false;
                pushInput({ boost: false });
              },
            },
            {
              id: "push",
              label: "PUSH",
              mode: "tap",
              disabled: !me?.pushReady,
              onPress: () => pushInput({ push: true }),
            },
            {
              id: "shield",
              label: "SHIELD",
              mode: "tap",
              disabled: (me?.shieldUntil ?? 0) <= Date.now(),
              onPress: () => {},
            },
          ]}
        />
      ) : null}

      {world.roundOver ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-5 text-white shadow-xl">
            <h2 className="text-center text-lg font-bold">ROUND OVER</h2>
            <p className="mt-1 text-center text-sm text-white/70">
              {world.winnerId === deviceId ? "YOU WIN!" : "Better luck next round"}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Rank</span>
                <span>#{me?.place ?? rank}</span>
              </div>
              <div className="flex justify-between">
                <span>Score</span>
                <span>{score}</span>
              </div>
              <div className="flex justify-between">
                <span>KNOCKOUT</span>
                <span>{knockouts}</span>
              </div>
              <div className="flex justify-between">
                <span>Survival Time</span>
                <span>{survivalSec}s</span>
              </div>
              <div className="flex justify-between">
                <span>Best Record</span>
                <span>{bestRecord}</span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onRematch}
                className="flex-1 rounded-lg bg-cyan-500 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400"
              >
                REMATCH
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-lg border border-white/20 py-2.5 text-sm font-medium hover:bg-white/10"
              >
                EXIT
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MultiplayerPlayShell>
  );
}
