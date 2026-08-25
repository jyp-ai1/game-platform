"use client";

/**
 * Sprint 17 — Agar Multiplayer scaffold (local WORLD + bots).
 * MP-UX-001: shared entry (character+color) + play shell chrome.
 */
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
  AGAR_BOARD_BG,
  AGAR_BOT_COUNT,
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

const AGAR_STYLES: MpStyleOption[] = [
  { id: "cell", label: "Cell", emoji: "⚪" },
  { id: "orb", label: "Orb", emoji: "🔵" },
  { id: "blob", label: "Blob", emoji: "🟢" },
  { id: "dot", label: "Dot", emoji: "🟡" },
  { id: "pulse", label: "Pulse", emoji: "🟣" },
];

function snapshotWorld(w: AgarWorld): AgarWorld {
  return {
    tick: w.tick,
    size: w.size,
    food: w.food,
    players: w.players,
    rankings: w.rankings,
  };
}

function applyLocalLook(w: AgarWorld, localId: string, color: string): void {
  const p = w.players[localId];
  if (p) p.color = color;
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
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
    setStarted(true);
  }

  function handleRetry() {
    reportedRef.current = false;
    const w = worldRef.current;
    respawnPlayer(w, deviceId, nickname);
    applyLocalLook(w, deviceId, color);
    const snap = snapshotWorld(w);
    worldRef.current = snap;
    setWorld(snap);
  }

  const offsetX = VIEW / 2 - cam.x;
  const offsetY = VIEW / 2 - cam.y;

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Agar"
        subtitle="세포 · 색상 선택 후 PLAY"
        styles={AGAR_STYLES}
        styleId={styleId}
        onStyleChange={setStyleId}
        colors={MP_PLAYER_COLORS}
        color={color}
        onColorChange={setColor}
        onPlay={handleStart}
        players={1}
        bots={AGAR_BOT_COUNT}
        roomCode={roomCode}
      />
    );
  }

  const rankHud = (
    <MultiplayerSideRankHud
      title="TOP 10"
      selfId={deviceId}
      entries={world.rankings.map((r) => ({
        id: r.id,
        label: r.nickname.slice(0, 8),
        value: r.mass,
      }))}
    />
  );

  return (
    <MultiplayerPlayShell
      onExit={() => setStarted(false)}
      sideHud={rankHud}
      topBar={
        <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2">
          <ScoreBox label="Mass" value={mass} />
          <ScoreBox label="Food" value={world.food.length} />
          <p className="text-xs text-muted-foreground">Room {roomCode}</p>
          <p className="text-xs text-muted-foreground">Space = Split · W = Eject</p>
        </div>
      }
    >
      <>
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
                          zIndex: Math.round(c.mass),
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

        {!alive ? (
          <StandardGameOverOverlay
            gameSlug="agar"
            score={Math.max(mass, me?.score ?? 0)}
            onRestart={handleRetry}
            onRetry={handleRetry}
            onExit={() => setStarted(false)}
          />
        ) : null}
      </>
    </MultiplayerPlayShell>
  );
}
