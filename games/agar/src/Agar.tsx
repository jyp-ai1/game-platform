"use client";

/**
 * Sprint 17 — Agar Multiplayer scaffold (local WORLD + bots).
 * Room sync follow-up: broadcast AgarWorld via multiplayer-sdk like Snake.
 */
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
  AGAR_BOARD_BG,
  AGAR_GRID_LINE,
  AGAR_TICK_MS,
  AGAR_WORLD,
  cameraFocus,
  createAgarWorld,
  ejectMass,
  massToRadius,
  respawnPlayer,
  setPlayerAim,
  splitPlayer,
  tickAgarWorld,
  totalMass,
  type AgarWorld,
} from "./agar-io-engine";

const VIEW = 520;

function snapshotWorld(w: AgarWorld): AgarWorld {
  return {
    tick: w.tick,
    size: w.size,
    food: w.food,
    players: w.players,
    rankings: w.rankings,
  };
}

export function AgarGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "You", []);
  const roomCode = useMemo(() => {
    if (typeof window === "undefined") return "WORLD";
    return new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "WORLD";
  }, []);
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<AgarWorld>(() => createAgarWorld(deviceId, nickname));
  const worldRef = useRef(world);
  worldRef.current = world;
  const boardRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const reportedRef = useRef(false);
  const lastEjectAtRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await ensureRoom(roomCode);
        if (!mounted) return;
        joinRoom(roomCode, { nickname });
      } catch {
        /* local MVP still playable without transport */
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
  const mass = me ? Math.round(totalMass(me)) : 0;
  const cam = cameraFocus(me);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const w = worldRef.current;
      tickAgarWorld(w);
      const snap = snapshotWorld(w);
      worldRef.current = snap;
      setWorld(snap);
    }, AGAR_TICK_MS);
    return () => window.clearInterval(id);
  }, [started]);

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
      setPlayerAim(worldRef.current, deviceId, worldX, worldY);
    },
    [cam.x, cam.y, deviceId]
  );

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        const w = worldRef.current;
        splitPlayer(w, deviceId);
        const snap = snapshotWorld(w);
        worldRef.current = snap;
        setWorld(snap);
        return;
      }
      if (e.code === "KeyW") {
        e.preventDefault();
        const now = performance.now();
        // Throttle key-repeat so holding W does not dump mass in one frame burst.
        if (now - lastEjectAtRef.current < 90) return;
        lastEjectAtRef.current = now;
        const w = worldRef.current;
        ejectMass(w, deviceId);
        const snap = snapshotWorld(w);
        worldRef.current = snap;
        setWorld(snap);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, deviceId]);

  function handleStart() {
    reportedRef.current = false;
    const next = createAgarWorld(deviceId, nickname);
    worldRef.current = next;
    setWorld(next);
    setStarted(true);
  }

  function handleRetry() {
    reportedRef.current = false;
    const w = worldRef.current;
    respawnPlayer(w, deviceId, nickname);
    const snap = snapshotWorld(w);
    worldRef.current = snap;
    setWorld(snap);
  }

  const offsetX = VIEW / 2 - cam.x;
  const offsetY = VIEW / 2 - cam.y;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2">
        <ScoreBox label="Mass" value={mass} />
        <ScoreBox label="Food" value={world.food.length} />
        <p className="text-xs text-muted-foreground">Room {roomCode}</p>
        <p className="text-xs text-muted-foreground">
          Space = 세포분열(Split) · W = 먹이 방출(Eject) · 마우스 = 이동
        </p>
      </div>

      {!started ? (
        <div className="flex aspect-square w-full max-w-xl flex-col items-center justify-center gap-4 rounded-xl border bg-card/60 p-8">
          <h2 className="text-xl font-semibold">Agar</h2>
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            세포를 키워 TOP10에 올라가세요. 작을수록 빠르고, 크면 다른 세포를 삼킬 수 있습니다.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Space = 세포분열 · W = 질량 방출 · 모바일 터치 조작은 추후 지원
          </p>
          <Button size="lg" onClick={handleStart}>
            ENTER WORLD
          </Button>
        </div>
      ) : (
        <div className="relative w-full max-w-xl">
          <div
            ref={boardRef}
            className="relative aspect-square w-full touch-none overflow-hidden rounded-xl border"
            style={{ backgroundColor: AGAR_BOARD_BG }}
            onPointerMove={(e) => onPointer(e.clientX, e.clientY)}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              onPointer(e.clientX, e.clientY);
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(${AGAR_GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${AGAR_GRID_LINE} 1px, transparent 1px)`,
                backgroundSize: `${(40 / AGAR_WORLD) * VIEW}px ${(40 / AGAR_WORLD) * VIEW}px`,
                backgroundPosition: `${offsetX}px ${offsetY}px`,
              }}
            />
            <div
              className="absolute left-0 top-0"
              style={{ width: AGAR_WORLD, height: AGAR_WORLD, transform: `translate(${offsetX}px, ${offsetY}px)` }}
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
            <StandardGameOverOverlay
              gameSlug="agar"
              score={Math.max(mass, me?.score ?? 0)}
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
