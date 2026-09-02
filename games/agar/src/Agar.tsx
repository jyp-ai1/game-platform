"use client";

/**
 * Agar — competitive loop (virus pop · Space split · W eject feed · comeback).
 * Shared MP shell UX kept: entry / YOU / TOP10 / minimap / death.
 */
import {
  getDeviceId,
  getLastNickname,
  MobileControlPad,
  MP_PLAYER_COLORS,
  MultiplayerDeathOverlay,
  MultiplayerEntrySelect,
  MultiplayerPlayShell,
  MultiplayerSideRankHud,
  MultiplayerYouBar,
  useGameSDK,
  type MpAiDifficulty,
  type MpStyleOption,
  type PadDirection,
} from "@game-platform/game-sdk";
import { ensureRoom, getRoom, joinRoomAsync, leaveRoom } from "@game-platform/multiplayer-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgarMinimap } from "./agar-minimap";
import {
  AGAR_BOARD_BG,
  AGAR_GRID_LINE,
  AGAR_TICK_MS,
  agarBotCountForDifficulty,
  cameraFocus,
  canSplitPlayer,
  createAgarWorld,
  ejectMass,
  gemRenderSize,
  growthStage,
  growthStageLabel,
  inViewport,
  massToRadius,
  setPlayerAim,
  respawnPlayer,
  splitPlayer,
  tickAgarWorld,
  totalMass,
  AGAR_MIN_SPLIT_MASS,
  AGAR_MIN_EJECT_MASS,
  type AgarWorld,
  type AgarAiDifficulty,
} from "./agar-io-engine";

function toAgarEngineTier(tier: MpAiDifficulty): AgarAiDifficulty {
  if (tier === "hard") return "hard";
  if (tier === "superhard") return "superhard";
  return "normal";
}

const VIEW = 520;

/**
 * AGAR-FUN-005.2 — Virus silhouette tips sit on the massToRadius circle (viewBox edge).
 * Valleys inset so the outer edge reads as toothed, not a smooth Cell disc.
 * Auth hitbox stays circular at massToRadius (unchanged); tips ≡ visible outer ≡ r.
 */
const VIRUS_SPIKE_POINTS = (() => {
  const spikes = 20;
  const tipR = 50;
  const valleyR = 36;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? tipR : valleyR;
    pts.push(`${50 + Math.cos(ang) * rad},${50 + Math.sin(ang) * rad}`);
  }
  return pts.join(" ");
})();

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
    hazards: w.hazards,
    players: w.players,
    rankings: w.rankings,
    aiDifficulty: w.aiDifficulty,
  };
}

type AgarPopup = {
  id: number;
  sx: number;
  sy: number;
  text: string;
  color: string;
  until: number;
};

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

function syncRoomPeers(w: AgarWorld, code: string, localId: string): void {
  const room = getRoom(code);
  if (!room) return;
  for (const rp of room.players) {
    if (rp.deviceId === localId) continue;
    const existing = w.players[rp.deviceId];
    if (!existing?.alive) {
      respawnPlayer(w, rp.deviceId, rp.nickname || "Guest");
      const peer = w.players[rp.deviceId];
      if (peer) peer.isBot = false;
    }
  }
}

export function AgarGame() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const nickname = useMemo(() => getLastNickname() || "You", []);
  const roomCode = useMemo(() => {
    if (typeof window === "undefined") return "WORLD";
    return new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "WORLD";
  }, []);
  /** QA-only: keep mobile pad visible for automation pad probes (no gameplay change). */
  const qaPadProbeRef = useRef(false);
  /** QA-only: seed split-ready mass before split harness (no gameplay change in normal play). */
  const qaSplitProbeRef = useRef(false);
  if (typeof window !== "undefined") {
    qaPadProbeRef.current =
      new URLSearchParams(window.location.search).get("mp_qa_pad") === "1";
    qaSplitProbeRef.current =
      new URLSearchParams(window.location.search).get("mp_qa_split") === "1";
  }
  const { reportScore } = useGameSDK();
  const [world, setWorld] = useState<AgarWorld>(() => createAgarWorld(deviceId, nickname));
  const worldRef = useRef(world);
  worldRef.current = world;
  const boardRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [styleId, setStyleId] = useState(AGAR_STYLES[0]!.id);
  const [color, setColor] = useState<string>(MP_PLAYER_COLORS[0]!);
  const [aiDifficulty, setAiDifficulty] = useState<MpAiDifficulty>("normal");
  const reportedRef = useRef(false);
  const lastEjectAtRef = useRef(0);
  const popupIdRef = useRef(0);
  const prevTickRef = useRef(0);
  const [popups, setPopups] = useState<AgarPopup[]>([]);
  const [eatPulseUntil, setEatPulseUntil] = useState(0);
  const [hazardFlashUntil, setHazardFlashUntil] = useState(0);
  /** Keep last non-dead steer vector while pad is held (mobile hold persistence). */
  const lastSteerRef = useRef({ vx: 0, vy: 0 });

  const styleEmoji = AGAR_STYLES.find((s) => s.id === styleId)?.emoji ?? "⚪";

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await ensureRoom(roomCode);
        await joinRoomAsync(roomCode, { nickname });
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
  const stage = growthStage(mass);

  useEffect(() => {
    if (world.tick === prevTickRef.current) return;
    prevTickRef.current = world.tick;
    const fb = me?.feedback;
    if (!fb) return;
    const ox = VIEW / 2 - cam.x;
    const oy = VIEW / 2 - cam.y;
    const id = popupIdRef.current++;
    const now = Date.now();
    if (fb.kind === "eat") {
      setPopups((p) => [
        ...p,
        { id, sx: fb.x + ox, sy: fb.y + oy, text: `+${Math.round(fb.amount)}`, color: "#fde047", until: now + 650 },
      ]);
      setEatPulseUntil(now + 180);
    } else {
      setPopups((p) => [
        ...p,
        { id, sx: fb.x + ox, sy: fb.y + oy, text: `-${Math.round(fb.amount)}`, color: "#f87171", until: now + 750 },
      ]);
      setHazardFlashUntil(now + 320);
    }
  }, [world.tick, me?.feedback, cam.x, cam.y]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setPopups((p) => (p.some((x) => x.until <= now) ? p.filter((x) => x.until > now) : p));
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      const w = worldRef.current;
      syncRoomPeers(w, roomCode, deviceId);
      tickAgarWorld(w);
      const snap = snapshotWorld(w);
      worldRef.current = snap;
      setWorld(snap);
    }, AGAR_TICK_MS);
    return () => window.clearInterval(id);
  }, [started, deviceId, roomCode]);

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

  // Fullscreen: keep aim tracking even if pointer leaves the scaled board briefly (mouse/pen only — touch uses D-pad)
  useEffect(() => {
    if (!started || !alive) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      onPointer(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [started, alive, onPointer]);

  const aimFromPad = useCallback(
    (dir: PadDirection) => {
      const w = worldRef.current;
      const focus = cameraFocus(w.players[deviceId]);
      const dist = 140;
      const ox = dir === "left" ? -dist : dir === "right" ? dist : 0;
      const oy = dir === "up" ? -dist : dir === "down" ? dist : 0;
      setPlayerAim(w, deviceId, focus.x + ox, focus.y + oy);
    },
    [deviceId]
  );

  const steerFromPad = useCallback(
    (vx: number, vy: number) => {
      if (Math.hypot(vx, vy) >= 0.12) {
        lastSteerRef.current = { vx, vy };
      } else if (Math.hypot(lastSteerRef.current.vx, lastSteerRef.current.vy) < 0.12) {
        return;
      }
      const w = worldRef.current;
      const p = w.players[deviceId];
      if (!p?.alive) return;
      const focus = cameraFocus(p);
      const dist = 140;
      const { vx: sx, vy: sy } = lastSteerRef.current;
      setPlayerAim(w, deviceId, focus.x + sx * dist, focus.y + sy * dist);
    },
    [deviceId]
  );

  const clearSteerFromPad = useCallback(() => {
    lastSteerRef.current = { vx: 0, vy: 0 };
  }, []);

  const doSplit = useCallback(() => {
    const w = worldRef.current;
    const now = Date.now();
    if (!canSplitPlayer(w, deviceId, now)) return;
    splitPlayer(w, deviceId, now);
    const snap = snapshotWorld(w);
    worldRef.current = snap;
    setWorld(snap);
  }, [deviceId]);

  const doEject = useCallback(() => {
    const now = performance.now();
    if (now - lastEjectAtRef.current < 90) return;
    lastEjectAtRef.current = now;
    const w = worldRef.current;
    ejectMass(w, deviceId);
    const snap = snapshotWorld(w);
    worldRef.current = snap;
    setWorld(snap);
  }, [deviceId]);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        doSplit();
        return;
      }
      if (e.code === "KeyW") {
        e.preventDefault();
        doEject();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, doSplit, doEject]);

  function handleStart() {
    reportedRef.current = false;
    const engineTier = toAgarEngineTier(aiDifficulty);
    const next = createAgarWorld(deviceId, nickname, engineTier);
    if (qaSplitProbeRef.current) {
      const me = next.players[deviceId];
      if (me?.cells[0]) {
        me.cells[0].mass = AGAR_MIN_SPLIT_MASS + AGAR_MIN_EJECT_MASS + 8;
      }
    }
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
    setStarted(true);
  }

  function handleRetry() {
    reportedRef.current = false;
    lastSteerRef.current = { vx: 0, vy: 0 };
    setPopups([]);
    const tier = worldRef.current.aiDifficulty ?? toAgarEngineTier(aiDifficulty);
    const next = createAgarWorld(deviceId, nickname, tier);
    applyLocalLook(next, deviceId, color);
    worldRef.current = next;
    setWorld(next);
  }

  function exitToDetail() {
    if (typeof window !== "undefined") {
      window.location.href = "/games/agar";
    }
  }

  useEffect(() => {
    if (!started) return;
    const w = window as Window & {
        __AGAR_QA__?: () => {
        mass: number;
        cells: number;
        canSplit: boolean;
        alive: boolean;
        ready: boolean;
        started: boolean;
        tick: number;
        aimX: number;
        aimY: number;
        x: number;
        y: number;
      };
    };
    w.__AGAR_QA__ = () => {
      const wr = worldRef.current;
      const p = wr.players[deviceId];
      const head = p?.cells[0];
      const mass = p ? Math.round(totalMass(p)) : 0;
      const cells = p?.cells.length ?? 0;
      const room = getRoom(roomCode);
      const roomPlayerIds = room?.players.map((rp) => rp.deviceId) ?? [];
      const peerWorldIds = Object.values(wr.players)
        .filter((row) => row.alive && !row.isBot && row.id !== deviceId)
        .map((row) => row.id);
      return {
        mass,
        cells,
        canSplit: canSplitPlayer(wr, deviceId),
        alive: !!p?.alive,
        ready: !!p?.alive && mass >= AGAR_MIN_SPLIT_MASS,
        started: true,
        tick: wr.tick,
        aimX: p?.aimX ?? 0,
        aimY: p?.aimY ?? 0,
        x: head?.x ?? 0,
        y: head?.y ?? 0,
        roomCode,
        localDeviceId: deviceId,
        roomPlayerIds,
        peerWorldIds,
      };
    };
    return () => {
      delete w.__AGAR_QA__;
    };
  }, [started, deviceId, roomCode]);

  const offsetX = VIEW / 2 - cam.x;
  const offsetY = VIEW / 2 - cam.y;
  const worldSize = world.size;
  const gridPx = (40 / worldSize) * VIEW;

  if (!started) {
    return (
      <MultiplayerEntrySelect
        title="Agar"
        subtitle="캐릭터 · 색상 · 난이도 선택 후 ENTER"
        styles={AGAR_STYLES}
        styleId={styleId}
        onStyleChange={setStyleId}
        colors={MP_PLAYER_COLORS}
        color={color}
        onColorChange={setColor}
        difficulty={aiDifficulty}
        onDifficultyChange={setAiDifficulty}
        entryMode="solo"
        onPlay={handleStart}
        playLabel="ENTER"
        showColorStep
        players={1}
        bots={agarBotCountForDifficulty(toAgarEngineTier(aiDifficulty))}
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
              <span className="flex flex-wrap items-center gap-2 text-[10px] font-normal text-white/45">
                <span
                  className="rounded px-1.5 py-0.5 font-semibold text-white/80"
                  style={{
                    backgroundColor:
                      stage === "large"
                        ? "rgba(251,191,36,0.25)"
                        : stage === "medium"
                          ? "rgba(96,165,250,0.22)"
                          : "rgba(255,255,255,0.12)",
                  }}
                  data-testid="agar-growth-stage"
                >
                  {growthStageLabel(stage)}
                </span>
                <span>Space = Split attack · W = Eject behind (kite / feed Virus) · Virus pops big cells</span>
              </span>
            }
          />
        }
      >
        <div
          ref={boardRef}
          className="absolute inset-0 touch-none overflow-hidden"
          style={{ backgroundColor: AGAR_BOARD_BG }}
          onPointerMove={(e) => {
            if (e.pointerType === "touch") return;
            onPointer(e.clientX, e.clientY);
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") return;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            onPointer(e.clientX, e.clientY);
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(${AGAR_GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${AGAR_GRID_LINE} 1px, transparent 1px)`,
              backgroundSize: `${gridPx}px ${gridPx}px`,
              backgroundPosition: `${offsetX}px ${offsetY}px`,
            }}
          />
          <div
            className="absolute left-0 top-0"
            style={{
              width: worldSize,
              height: worldSize,
              transform: `translate(${offsetX}px, ${offsetY}px)`,
            }}
          >
            {world.hazards.map((h) => {
              if (!inViewport(h.x, h.y, cam.x, cam.y, VIEW, h.radius + 20)) return null;
              const pulse = 1 + Math.sin(Date.now() / 280) * 0.04;
              const d = h.radius * 2 * pulse;
              return (
                <div
                  key={h.id}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: h.x - d / 2,
                    top: h.y - d / 2,
                    width: d,
                    height: d,
                    background:
                      "radial-gradient(circle, rgba(239,68,68,0.38) 0%, rgba(127,29,29,0.18) 65%, transparent 100%)",
                    border: "2px dashed rgba(248,113,113,0.6)",
                    boxShadow: "0 0 16px rgba(239,68,68,0.4)",
                    zIndex: 0,
                  }}
                  title="Toxic zone"
                  data-testid="agar-hazard"
                />
              );
            })}
            {world.food.map((f) => {
              if (!inViewport(f.x, f.y, cam.x, cam.y, VIEW)) return null;
              const isEject = f.kind === "eject" || f.id.startsWith("e");
              const isFrag = f.kind === "frag" || f.id.startsWith("vf") || f.id.startsWith("vo");
              const size = isEject ? 9 : isFrag ? Math.max(6, gemRenderSize(f.mass)) : gemRenderSize(f.mass);
              return (
                <div
                  key={f.id}
                  className="absolute rounded-full"
                  style={{
                    left: f.x - size / 2,
                    top: f.y - size / 2,
                    width: size,
                    height: size,
                    backgroundColor: f.color,
                    boxShadow: isEject
                      ? `0 0 10px ${f.color}, 0 0 4px #fff`
                      : f.mass >= 2
                        ? `0 0 6px ${f.color}`
                        : undefined,
                    border: isEject ? "1px solid rgba(255,255,255,0.55)" : undefined,
                    zIndex: isEject ? 9 : 1,
                  }}
                />
              );
            })}
            {(world.viruses ?? []).map((v) => {
              if (!inViewport(v.x, v.y, cam.x, cam.y, VIEW, 80)) return null;
              // Box = 2×massToRadius; spike tips on the rim ≡ auth collision radius (005.1 fidelity)
              const r = massToRadius(v.mass);
              const gradId = `agar-virus-${v.id}`;
              return (
                <div
                  key={v.id}
                  className="absolute"
                  style={{
                    left: v.x - r,
                    top: v.y - r,
                    width: r * 2,
                    height: r * 2,
                    zIndex: 8,
                    filter: "drop-shadow(0 0 5px rgba(74,222,128,0.75))",
                  }}
                  title="Virus"
                >
                  {/* Spiky body only — no round underlay (CEO: not ordinary green cell) */}
                  <svg
                    width={r * 2}
                    height={r * 2}
                    viewBox="0 0 100 100"
                    className="absolute inset-0 block"
                    aria-hidden
                  >
                    <defs>
                      <radialGradient id={gradId} cx="38%" cy="32%" r="68%">
                        <stop offset="0%" stopColor="#f7fee7" />
                        <stop offset="22%" stopColor="#a3e635" />
                        <stop offset="55%" stopColor="#16a34a" />
                        <stop offset="82%" stopColor="#14532d" />
                        <stop offset="100%" stopColor="#022c22" />
                      </radialGradient>
                    </defs>
                    <polygon
                      points={VIRUS_SPIKE_POINTS}
                      fill={`url(#${gradId})`}
                      stroke="#052e16"
                      strokeWidth="2.2"
                      strokeLinejoin="miter"
                    />
                    <polygon
                      points={VIRUS_SPIKE_POINTS}
                      fill="none"
                      stroke="#bbf7d0"
                      strokeWidth="0.9"
                      strokeLinejoin="miter"
                      opacity="0.85"
                    />
                    {/* Dark core — bomb/hazard cue vs smooth Cell */}
                    <circle cx="50" cy="50" r="22" fill="rgba(2,44,34,0.55)" />
                    <circle cx="50" cy="50" r="9" fill="rgba(190,242,100,0.4)" />
                    <circle cx="42" cy="40" r="5" fill="rgba(236,252,203,0.35)" />
                  </svg>
                </div>
              );
            })}
            {Object.values(world.players).map((p) =>
              p.alive
                ? p.cells.map((c, i) => {
                    // Fill disc === auth radius (FUN-005.1). No CSS border (border-box inset).
                    const r = massToRadius(c.mass);
                    if (!inViewport(c.x, c.y, cam.x, cam.y, VIEW, r + 24)) return null;
                    const isYou = p.id === deviceId;
                    const showEmoji = isYou && r > 16;
                    const cellStage = isYou ? stage : growthStage(c.mass);
                    const eatPulse = isYou && Date.now() < eatPulseUntil ? 1.06 : 1;
                    // Identity chrome outside the fill via outline/glow — does not shrink disc
                    const chrome = isYou
                      ? {
                          outline: "2px solid rgba(255,255,255,0.95)",
                          boxShadow:
                            cellStage === "large"
                              ? `0 0 18px #fbbf24, 0 0 8px ${p.color}`
                              : cellStage === "medium"
                                ? `0 0 12px rgba(96,165,250,0.75), 0 0 5px ${p.color}`
                                : `0 0 14px ${p.color}, 0 0 5px rgba(255,255,255,0.7)`,
                        }
                      : {
                          outline: "1px solid rgba(255,255,255,0.25)",
                          boxShadow: undefined as string | undefined,
                        };
                    return (
                      <div
                        key={`${p.id}-${i}`}
                        className="absolute flex items-center justify-center rounded-full text-[9px] font-semibold text-white/90"
                        style={{
                          left: c.x - r,
                          top: c.y - r,
                          width: r * 2,
                          height: r * 2,
                          backgroundColor: p.color,
                          border: "none",
                          outline: chrome.outline,
                          outlineOffset: 0,
                          boxShadow: chrome.boxShadow,
                          transform: eatPulse !== 1 ? `scale(${eatPulse})` : undefined,
                          transition: eatPulse !== 1 ? "transform 120ms ease-out" : undefined,
                          zIndex: Math.min(50, Math.round(c.mass) + (isYou ? 10 : 0)),
                        }}
                        title={isYou ? "YOU" : p.nickname}
                      >
                        {showEmoji ? styleEmoji : r > 14 ? p.nickname.slice(0, 6) : null}
                      </div>
                    );
                  })
                : null
            )}
            {popups.map((pop) => (
              <div
                key={pop.id}
                className="pointer-events-none absolute text-xs font-bold"
                style={{
                  left: pop.sx,
                  top: pop.sy - 12,
                  color: pop.color,
                  textShadow: "0 1px 4px rgba(0,0,0,0.85)",
                  zIndex: 60,
                }}
              >
                {pop.text}
              </div>
            ))}
          </div>
          {Date.now() < hazardFlashUntil ? (
            <div
              className="pointer-events-none absolute inset-0"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", zIndex: 55 }}
            />
          ) : null}
        </div>
      </MultiplayerPlayShell>

      {started && (alive || qaPadProbeRef.current) ? (
        <MobileControlPad
          onDirection={aimFromPad}
          onSteer={steerFromPad}
          onDirectionEnd={clearSteerFromPad}
          actions={[
            { id: "split", label: "SPLIT", mode: "tap", onPress: doSplit },
            { id: "eject", label: "EJECT", mode: "tap", onPress: doEject },
          ]}
        />
      ) : null}

      {!alive && !qaPadProbeRef.current ? (
        <div data-testid="agar-game-over">
          <MultiplayerDeathOverlay
            score={finalScore}
            metric={`L:${finalScore}`}
            onRetry={handleRetry}
            onExit={exitToDetail}
          />
        </div>
      ) : null}
    </>
  );
}
