"use client";

/**
 * Agar — competitive loop (decay · virus · Space split · W backward eject).
 * Shared MP shell UX kept: entry / YOU / TOP10 / minimap / death.
 */
import {
  DEFAULT_MP_AI_DIFFICULTY,
  getDeviceId,
  getLastNickname,
  MP_PLAYER_COLORS,
  MultiplayerDeathOverlay,
  MultiplayerEntrySelect,
  MultiplayerPlayShell,
  MultiplayerSideRankHud,
  MultiplayerYouBar,
  toEngineAiTier,
  useGameSDK,
  type MpStyleOption,
} from "@game-platform/game-sdk";
import { ensureRoom, joinRoom, leaveRoom } from "@game-platform/multiplayer-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgarMinimap } from "./agar-minimap";
import {
  AGAR_BOARD_BG,
  AGAR_GRID_LINE,
  AGAR_TICK_MS,
  AGAR_WORLD,
  agarBotCountForDifficulty,
  cameraFocus,
  canSplitPlayer,
  createAgarWorld,
  ejectMass,
  massToRadius,
  setPlayerAim,
  splitPlayer,
  tickAgarWorld,
  totalMass,
  type AgarWorld,
} from "./agar-io-engine";

const VIEW = 520;

const AGAR_STYLES: MpStyleOption[] = [
  { id: "cell", label: "Cell", emoji: "⚪", color: MP_PLAYER_COLORS[0] },
  { id: "orb", label: "Orb", emoji: "🔵", color: MP_PLAYER_COLORS[1] },
  { id: "blob", label: "Blob", emoji: "🟢", color: MP_PLAYER_COLORS[2] },
  { id: "dot", label: "Dot", emoji: "🟡", color: MP_PLAYER_COLORS[3] },
  { id: "pulse", label: "Pulse", emoji: "🟣", color: MP_PLAYER_COLORS[4] },
];

function snapshotWorld(w: AgarWorld): AgarWorld {
  return {
    tick: w.tick,
    size: w.size,
    food: w.food,
    viruses: w.viruses,
    players: w.players,
    rankings: w.rankings,
    aiDifficulty: w.aiDifficulty,
  };
}

function applyLocalLook(w: AgarWorld, localId: string, color: string): void {
  const p = w.players[localId];
  if (p) p.color = color;
}

function localRank(world: AgarWorld, id: string): number {
  const sorted = Object.values(world.players)
    .filter((p) => p.alive)
    .sort((a, b) => totalMass(b) - totalMass(a));
  const idx = sorted.findIndex((p) => p.id === id);
  return idx >= 0 ? idx + 1 : 0;
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
  const [styleId, setStyleId] = useState(AGAR_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const aiDifficulty = DEFAULT_MP_AI_DIFFICULTY;
  const reportedRef = useRef(false);
  const lastEjectAtRef = useRef(0);

  const styleEmoji = AGAR_STYLES.find((s) => s.id === styleId)?.emoji ?? "⚪";

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
  const rank = localRank(world, deviceId);
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
      if (rect.width < 2 || rect.height < 2) return;
      // Fullscreen-safe: map client → board local via getBoundingClientRect (CSS scale OK)
      const localX = ((clientX - rect.left) / rect.width) * VIEW;
      const localY = ((clientY - rect.top) / rect.height) * VIEW;
      const focus = cameraFocus(worldRef.current.players[deviceId]);
      const worldX = focus.x - VIEW / 2 + localX;
      const worldY = focus.y - VIEW / 2 + localY;
      setPlayerAim(worldRef.current, deviceId, worldX, worldY);
    },
    [deviceId]
  );

  // Fullscreen: keep aim tracking even if pointer leaves the scaled board briefly
  useEffect(() => {
    if (!started || !alive) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" && e.buttons === 0) return;
      onPointer(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [started, alive, onPointer]);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        const w = worldRef.current;
        const now = Date.now();
        if (!canSplitPlayer(w, deviceId, now)) return;
        splitPlayer(w, deviceId, now);
        const snap = snapshotWorld(w);
        worldRef.current = snap;
        setWorld(snap);
        return;
      }
      if (e.code === "KeyW") {
        e.preventDefault();
        const now = performance.now();
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
    const engineTier = toEngineAiTier(aiDifficulty);
    const next = createAgarWorld(deviceId, nickname, engineTier);
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
    setStarted(true);
  }

  function handleRetry() {
    reportedRef.current = false;
    setStarted(false);
  }

  function exitToDetail() {
    if (typeof window !== "undefined") {
      window.location.href = "/games/agar";
    }
  }

  const offsetX = VIEW / 2 - cam.x;
  const offsetY = VIEW / 2 - cam.y;

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Agar"
        subtitle="캐릭터 · 색상 선택 후 ENTER"
        styles={AGAR_STYLES}
        styleId={styleId}
        onStyleChange={setStyleId}
        colors={MP_PLAYER_COLORS}
        color={color}
        onColorChange={setColor}
        onPlay={handleStart}
        playLabel="ENTER"
        showColorStep
        players={1}
        bots={agarBotCountForDifficulty(toEngineAiTier(aiDifficulty))}
        roomCode={roomCode}
      />
    );
  }

  const topRanks = world.rankings.map((r, i) => ({ id: r.id, rank: i + 1 }));
  const playerList = Object.values(world.players);

  const rankHud = (
    <div className="flex w-full flex-col gap-2">
      <MultiplayerSideRankHud
        title="TOP 10"
        selfId={deviceId}
        entries={world.rankings.map((r) => ({
          id: r.id,
          label: r.nickname.slice(0, 8),
          value: `L:${r.mass}`,
        }))}
      />
      <AgarMinimap
        players={playerList}
        worldSize={world.size}
        selfId={deviceId}
        topRanks={topRanks}
        viewSize={VIEW}
      />
    </div>
  );

  const finalScore = Math.max(mass, me?.score ?? 0);

  return (
    <>
      <MultiplayerPlayShell
        onExit={exitToDetail}
        sideHud={rankHud}
        topBar={
          <MultiplayerYouBar
            metric={`L:${mass}`}
            rank={rank}
            extra={
              <span className="text-[10px] font-normal text-white/45">
                Space = Split · W = Eject back · Virus pops large
              </span>
            }
          />
        }
      >
        <div
          ref={boardRef}
          className="absolute inset-0 touch-none overflow-hidden"
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
                  left: f.x - (f.mass > 2 ? 3 : 2),
                  top: f.y - (f.mass > 2 ? 3 : 2),
                  width: f.mass > 2 ? 6 : 4,
                  height: f.mass > 2 ? 6 : 4,
                  backgroundColor: f.color,
                  boxShadow: f.mass > 2 ? `0 0 6px ${f.color}` : undefined,
                }}
              />
            ))}
            {(world.viruses ?? []).map((v) => {
              const r = massToRadius(v.mass);
              return (
                <div
                  key={v.id}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: v.x - r,
                    top: v.y - r,
                    width: r * 2,
                    height: r * 2,
                    zIndex: 8,
                  }}
                  title="Virus"
                >
                  {/* Spiky virus — visually distinct from round cells / food */}
                  <div
                    className="h-full w-full"
                    style={{
                      background:
                        "radial-gradient(circle at 40% 35%, #bbf7d0 0%, #22c55e 45%, #14532d 100%)",
                      clipPath:
                        "polygon(50% 0%, 63% 18%, 85% 12%, 78% 35%, 100% 50%, 78% 65%, 85% 88%, 63% 82%, 50% 100%, 37% 82%, 15% 88%, 22% 65%, 0% 50%, 22% 35%, 15% 12%, 37% 18%)",
                      boxShadow: "0 0 10px rgba(34,197,94,0.55)",
                      border: "1px solid rgba(187,247,176,0.5)",
                    }}
                  />
                </div>
              );
            })}
            {Object.values(world.players).map((p) =>
              p.alive
                ? p.cells.map((c, i) => {
                    const r = massToRadius(c.mass);
                    const showEmoji = p.id === deviceId && r > 16;
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
                          zIndex: Math.min(50, Math.round(c.mass)),
                        }}
                        title={p.nickname}
                      >
                        {showEmoji ? styleEmoji : r > 14 ? p.nickname.slice(0, 6) : null}
                      </div>
                    );
                  })
                : null
            )}
          </div>
        </div>
      </MultiplayerPlayShell>

      {!alive ? (
        <MultiplayerDeathOverlay
          score={finalScore}
          metric={`L:${finalScore}`}
          onRetry={handleRetry}
          onExit={exitToDetail}
        />
      ) : null}
    </>
  );
}
