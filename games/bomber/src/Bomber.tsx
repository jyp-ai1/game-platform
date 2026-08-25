"use client";

/** Sprint17 STEP8 — Bomber MVP. MP-UX-001: shared entry + play shell. */
import {
  getDeviceId,
  getLastNickname,
  MP_PLAYER_COLORS,
  MultiplayerEntrySelect,
  MultiplayerPlayShell,
  MultiplayerSideRankHud,
  StandardGameOverOverlay,
  useGameSDK,
  type MpStyleOption,
} from "@game-platform/game-sdk";
import { ensureRoom, joinRoom, leaveRoom } from "@game-platform/multiplayer-sdk";
import { ScoreBox } from "@game-platform/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BOMBER_TICK_MS,
  createBomberWorld,
  plantBomb,
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
    cols: w.cols,
    rows: w.rows,
    grid: w.grid.map((r) => r.slice()),
    players: { ...w.players },
    bombs: w.bombs.slice(),
    blasts: w.blasts.slice(),
    rankings: w.rankings.slice(),
    roundOverAt: w.roundOverAt,
    winnerId: w.winnerId,
  };
}

function applyLocalLook(w: BomberWorld, localId: string, color: string): void {
  const p = w.players[localId];
  if (p) p.color = color;
}

export function BomberGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "You", []);
  const roomCode = useMemo(() => {
    if (typeof window === "undefined") return "ROOM";
    return new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "ROOM";
  }, []);
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<BomberWorld>(() => createBomberWorld(deviceId, nickname, 3));
  const worldRef = useRef(world);
  worldRef.current = world;
  const [started, setStarted] = useState(false);
  const [styleId, setStyleId] = useState(BOMBER_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
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

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const w = worldRef.current;
      tickBomberWorld(w);
      const next = snap(w);
      worldRef.current = next;
      setWorld(next);
    }, BOMBER_TICK_MS);
    return () => window.clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (!started || alive || reportedRef.current) return;
    if (Object.values(world.players).filter((p) => p.alive).length > 0) return;
    reportedRef.current = true;
    void reportScore("bomber", me?.wins ?? 0);
  }, [started, alive, world.players, me?.wins, reportScore]);

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
    const next = createBomberWorld(deviceId, nickname, 3);
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
    setStarted(true);
  }, [deviceId, nickname, color]);

  const handleRetry = useCallback(() => {
    reportedRef.current = false;
    const next = createBomberWorld(deviceId, nickname, 3);
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
  }, [deviceId, nickname, color]);

  const width = world.cols * CELL;
  const height = world.rows * CELL;
  const living = Object.values(world.players).filter((p) => p.alive).length;
  const botCount = Object.values(world.players).filter((p) => p.isBot).length;

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Bomber"
        subtitle="캐릭터 · 색상 선택 후 PLAY"
        styles={BOMBER_STYLES}
        styleId={styleId}
        onStyleChange={setStyleId}
        colors={MP_PLAYER_COLORS}
        color={color}
        onColorChange={setColor}
        onPlay={handleStart}
        players={1}
        bots={botCount}
        roomCode={roomCode}
      />
    );
  }

  const rankHud = (
    <MultiplayerSideRankHud
      title="TOP"
      selfId={deviceId}
      entries={world.rankings.map((r) => ({
        id: r.id,
        label: r.nickname.slice(0, 7),
        value: `W${r.wins}`,
      }))}
    />
  );

  return (
    <MultiplayerPlayShell
      onExit={() => setStarted(false)}
      sideHud={rankHud}
      topBar={
        <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2">
          <ScoreBox label="Round" value={world.round} />
          <ScoreBox label="Alive" value={living} />
          <ScoreBox label="Wins" value={me?.wins ?? 0} />
          <p className="text-xs text-muted-foreground">Room {roomCode} · Space=Bomb · WASD</p>
        </div>
      }
    >
      <>
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
          {world.roundOverAt ? (
            <div className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-amber-200">
              Round clear · next…
            </div>
          ) : null}
        </div>

        {!alive && !world.roundOverAt ? (
          <StandardGameOverOverlay
            gameSlug="bomber"
            score={me?.wins ?? 0}
            onRestart={handleRetry}
            onRetry={handleRetry}
            onExit={() => setStarted(false)}
          />
        ) : null}
      </>
    </MultiplayerPlayShell>
  );
}
