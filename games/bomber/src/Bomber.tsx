"use client";

/** Sprint17 STEP8 — Bomber MVP (2–8p): move, bomb, blast, death, round, LB. */
import {
  getDeviceId,
  getLastNickname,
  StandardGameOverOverlay,
  useGameSDK,
} from "@game-platform/game-sdk";
import { ensureRoom, joinRoom, leaveRoom } from "@game-platform/multiplayer-sdk";
import { Button, ScoreBox } from "@game-platform/ui";
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
  const reportedRef = useRef(false);

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
    worldRef.current = next;
    setWorld(next);
    setStarted(true);
  }, [deviceId, nickname]);

  const handleRetry = useCallback(() => {
    reportedRef.current = false;
    const next = createBomberWorld(deviceId, nickname, 3);
    worldRef.current = next;
    setWorld(next);
  }, [deviceId, nickname]);

  const width = world.cols * CELL;
  const height = world.rows * CELL;
  const living = Object.values(world.players).filter((p) => p.alive).length;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2">
        <ScoreBox label="Round" value={world.round} />
        <ScoreBox label="Alive" value={living} />
        <ScoreBox label="Wins" value={me?.wins ?? 0} />
        <p className="text-xs text-muted-foreground">Room {roomCode} · 2–8p · Space=Bomb · WASD/Arrows</p>
      </div>

      {!started ? (
        <div className="flex aspect-square w-full max-w-xl flex-col items-center justify-center gap-4 rounded-xl border bg-card/60 p-8">
          <h2 className="text-xl font-semibold">Bomber</h2>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            폭탄을 설치하고 폭발로 상대를 제거하세요. 라운드 승자가 TOP에 기록됩니다.
          </p>
          <Button size="lg" onClick={handleStart}>
            START MATCH
          </Button>
        </div>
      ) : (
        <div className="relative w-full max-w-xl">
          <div
            className="relative mx-auto overflow-hidden rounded-xl border"
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
                  className="absolute rounded-sm"
                  style={{
                    left: p.x * CELL + 4,
                    top: p.y * CELL + 4,
                    width: CELL - 8,
                    height: CELL - 8,
                    backgroundColor: p.color,
                    boxShadow: p.id === deviceId ? `0 0 8px ${p.color}` : undefined,
                  }}
                  title={p.nickname}
                />
              ) : null
            )}
            <aside className="absolute right-2 top-2 w-32 rounded-lg border border-white/10 bg-black/55 p-2 text-[11px] backdrop-blur">
              <p className="mb-1 font-semibold text-amber-200">TOP</p>
              <ol className="space-y-0.5">
                {world.rankings.map((r, i) => (
                  <li key={r.id} className="flex justify-between gap-1">
                    <span className={r.id === deviceId ? "text-cyan-300" : "text-white/80"}>
                      {i + 1}. {r.nickname.slice(0, 7)}
                    </span>
                    <span className="font-mono text-white/60">W{r.wins}</span>
                  </li>
                ))}
              </ol>
            </aside>
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
        </div>
      )}
    </div>
  );
}
