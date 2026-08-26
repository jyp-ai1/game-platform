"use client";

/** Sprint17 STEP8 / STEP4 — Bomber MVP + round ladder + map presets.
 * MP-COMMON-SHELL-001 — shared entry / YOU / TOP10 / minimap / death chrome.
 */
import {
  DEFAULT_MP_AI_DIFFICULTY,
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
  type MpAiDifficulty,
  type MpMinimapDot,
  type MpStyleOption,
} from "@game-platform/game-sdk";
import { ensureRoom, joinRoom, leaveRoom } from "@game-platform/multiplayer-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BOMBER_MAX_ROUNDS,
  BOMBER_TICK_MS,
  createBomberWorld,
  plantBomb,
  remainingTimeSec,
  tickBomberWorld,
  tryMove,
  type BomberWorld,
} from "./bomber-engine";

const CELL = 28;

const BOMBER_STYLES: MpStyleOption[] = [
  { id: "bomber", label: "Bomber", emoji: "💣" },
  { id: "hero", label: "Hero", emoji: "🧑" },
  { id: "ninja", label: "Ninja", emoji: "🥷" },
  { id: "robot", label: "Robot", emoji: "🤖" },
  { id: "ghost", label: "Ghost", emoji: "👻" },
];

function snap(w: BomberWorld): BomberWorld {
  return {
    tick: w.tick,
    round: w.round,
    maxRounds: w.maxRounds,
    mapId: w.mapId,
    cols: w.cols,
    rows: w.rows,
    grid: w.grid.map((r) => r.slice()),
    players: { ...w.players },
    bombs: w.bombs.slice(),
    blasts: w.blasts.slice(),
    rankings: w.rankings.slice(),
    roundOverAt: w.roundOverAt,
    winnerId: w.winnerId,
    roundStartedAt: w.roundStartedAt,
    timeLimitSec: w.timeLimitSec,
    difficulty: w.difficulty,
    fuseMs: w.fuseMs,
    matchOver: w.matchOver,
    aiTier: w.aiTier,
  };
}

function applyLocalLook(w: BomberWorld, localId: string, color: string): void {
  const p = w.players[localId];
  if (p) p.color = color;
}

function localRank(world: BomberWorld, id: string): number {
  const idx = world.rankings.findIndex((r) => r.id === id);
  return idx >= 0 ? idx + 1 : 0;
}

export function BomberGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "You", []);
  const roomCode = useMemo(() => {
    if (typeof window === "undefined") return "WORLD";
    return new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "WORLD";
  }, []);
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<BomberWorld>(() => createBomberWorld(deviceId, nickname));
  const worldRef = useRef(world);
  worldRef.current = world;
  const [started, setStarted] = useState(false);
  const [styleId, setStyleId] = useState(BOMBER_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const [aiDifficulty, setAiDifficulty] = useState<MpAiDifficulty>(DEFAULT_MP_AI_DIFFICULTY);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const reportedRef = useRef(false);

  const styleEmoji = BOMBER_STYLES.find((s) => s.id === styleId)?.emoji ?? "💣";

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await ensureRoom(roomCode);
        if (!mounted) return;
        joinRoom(roomCode, { nickname });
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
  }, [roomCode, nickname]);

  const me = world.players[deviceId];
  const alive = !!me?.alive;
  const wins = me?.wins ?? 0;
  const kills = me?.kills ?? 0;
  const rank = localRank(world, deviceId);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const w = worldRef.current;
      tickBomberWorld(w);
      const next = snap(w);
      worldRef.current = next;
      setWorld(next);
      setNowTick(Date.now());
    }, BOMBER_TICK_MS);
    return () => window.clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (!started || reportedRef.current) return;
    if (!world.matchOver && alive) return;
    if (!world.matchOver && Object.values(world.players).filter((p) => p.alive).length > 0) return;
    if (!world.matchOver) return;
    reportedRef.current = true;
    void reportScore("bomber", wins);
  }, [started, alive, world.matchOver, world.players, wins, reportScore]);

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
        const w = worldRef.current;
        plantBomb(w, deviceId);
        const next = snap(w);
        worldRef.current = next;
        setWorld(next);
        return;
      }
      const d = map[e.code];
      if (!d) return;
      e.preventDefault();
      const w = worldRef.current;
      tryMove(w, deviceId, d[0], d[1]);
      const next = snap(w);
      worldRef.current = next;
      setWorld(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, deviceId]);

  const handleStart = useCallback(() => {
    reportedRef.current = false;
    const next = createBomberWorld(deviceId, nickname, 2, aiDifficulty);
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
    setStarted(true);
  }, [deviceId, nickname, color, aiDifficulty]);

  const handleRetry = useCallback(() => {
    reportedRef.current = false;
    const next = createBomberWorld(deviceId, nickname, 2, aiDifficulty);
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
  }, [deviceId, nickname, color, aiDifficulty]);

  const exitToLobby = useCallback(() => {
    setStarted(false);
  }, []);

  const width = world.cols * CELL;
  const height = world.rows * CELL;
  const botCount = Object.values(world.players).filter((p) => p.isBot).length;
  const timeLeft = remainingTimeSec(world, nowTick);
  const showDeath = world.matchOver || (!alive && world.round >= world.maxRounds && !!world.roundOverAt);

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Bomber"
        subtitle="캐릭터 · 색상 선택 후 ENTER WORLD"
        styles={BOMBER_STYLES}
        styleId={styleId}
        onStyleChange={setStyleId}
        colors={MP_PLAYER_COLORS}
        color={color}
        onColorChange={setColor}
        difficulty={aiDifficulty}
        onDifficultyChange={setAiDifficulty}
        onPlay={handleStart}
        playLabel="ENTER WORLD"
        players={1}
        bots={botCount || 3}
        roomCode={roomCode}
      />
    );
  }

  const top1Id = world.rankings[0]?.id ?? null;
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
    title: `${p.nickname} L:${p.wins}`,
  }));

  const rankHud = (
    <div className="flex w-full flex-col gap-2">
      <MultiplayerSideRankHud
        title="TOP 10"
        selfId={deviceId}
        entries={world.rankings.map((r) => ({
          id: r.id,
          label: r.nickname.slice(0, 7),
          value: `L:${r.wins}`,
        }))}
      />
      <MultiplayerMinimap dots={minimapDots} />
    </div>
  );

  return (
    <>
      <MultiplayerPlayShell
        onExit={exitToLobby}
        sideHud={rankHud}
        topBar={
          <MultiplayerYouBar
            metric={`L:${wins}`}
            rank={rank}
            extra={
              <>
                <span
                  data-testid="bomber-round-hud"
                  className="rounded-md bg-black/55 px-2.5 py-1 tabular-nums"
                >
                  ROUND {world.round} / {world.maxRounds || BOMBER_MAX_ROUNDS}
                </span>
                <span className="rounded-md bg-black/55 px-2.5 py-1 tabular-nums">
                  TIME {timeLeft}
                </span>
                <span className="rounded-md bg-black/45 px-2 py-1 text-[11px] text-white/70">
                  {alive ? "❤️" : "🖤"} · K{kills}
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
          {world.bombs.map((b) => (
            <div
              key={b.id}
              className="absolute rounded-full bg-zinc-200"
              style={{
                left: b.x * CELL + 6,
                top: b.y * CELL + 6,
                width: CELL - 12,
                height: CELL - 12,
              }}
            />
          ))}
          {world.blasts.flatMap((bl) =>
            bl.cells.map((c, i) => (
              <div
                key={`${bl.id}-${i}`}
                className="absolute bg-orange-400/80"
                style={{ left: c.x * CELL, top: c.y * CELL, width: CELL - 1, height: CELL - 1 }}
              />
            ))
          )}
          {Object.values(world.players).map((p) =>
            p.alive ? (
              <div
                key={p.id}
                className="absolute flex items-center justify-center rounded-sm text-sm"
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
          {world.roundOverAt && !world.matchOver ? (
            <div className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-amber-200">
              Round clear · next map…
            </div>
          ) : null}
          {!alive && !world.matchOver ? (
            <div className="absolute inset-x-0 bottom-4 z-20 text-center text-xs text-white/70">
              Spectating · next round soon
            </div>
          ) : null}
        </div>
      </MultiplayerPlayShell>

      {showDeath ? (
        <MultiplayerDeathOverlay
          score={wins}
          metric={`L:${wins} · Kills ${kills}`}
          onRetry={handleRetry}
          onExit={exitToLobby}
        />
      ) : null}
    </>
  );
}
