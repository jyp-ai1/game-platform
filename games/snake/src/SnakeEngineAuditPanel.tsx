"use client";

import { cn } from "@game-platform/ui";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

import {
  getEngineAuditSnapshot,
  subscribeEngineAudit,
  type AuditStatus,
  type EngineAuditSnapshot,
} from "./snake-engine-audit-store";

function statusClass(status: AuditStatus): string {
  switch (status) {
    case "ok":
      return "border-emerald-500/50 bg-emerald-950/40 text-emerald-200";
    case "fail":
      return "border-red-500/60 bg-red-950/50 text-red-200";
    case "warn":
      return "border-amber-500/50 bg-amber-950/40 text-amber-200";
    default:
      return "border-white/15 bg-black/40 text-muted-foreground";
  }
}

function statusDot(status: AuditStatus): string {
  switch (status) {
    case "ok":
      return "bg-emerald-400";
    case "fail":
      return "bg-red-500 animate-pulse";
    case "warn":
      return "bg-amber-400";
    default:
      return "bg-white/30";
  }
}

function AuditSection({
  title,
  status,
  children,
}: {
  title: string;
  status: AuditStatus;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-md border px-2 py-1.5", statusClass(status))}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className={cn("inline-block h-2 w-2 rounded-full", statusDot(status))} />
        <h3 className="text-[10px] font-bold uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-0.5 text-[10px] leading-snug">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number | boolean }) {
  const text = typeof value === "boolean" ? (value ? "YES" : "NO") : String(value);
  return (
    <p>
      <span className="text-white/50">{label}</span>{" "}
      <span className={text === "NO" || text === "FAIL" ? "font-semibold text-red-300" : ""}>{text}</span>
    </p>
  );
}

/** Right-side engine state audit — ?debug=1 only. Read-only. */
export function SnakeEngineAuditPanel() {
  const audit = useSyncExternalStore(subscribeEngineAudit, getEngineAuditSnapshot, getEngineAuditSnapshot);

  return (
    <aside
      data-testid="snake-engine-audit-panel"
      className="w-52 shrink-0 rounded-lg border border-violet-500/30 bg-black/75 p-2 font-mono text-[10px] backdrop-blur-sm sm:w-56"
      aria-label="Snake engine state audit"
    >
      <p className="mb-2 border-b border-white/10 pb-1 text-[11px] font-bold text-violet-300">
        Engine State Audit
      </p>
      <div className="space-y-2">
        <RoomSection audit={audit} />
        <PlayerSection audit={audit} />
        <SnakeSection audit={audit} />
        <InputSection audit={audit} />
        <TickSection audit={audit} />
        <RenderSection audit={audit} />
      </div>
      {audit.localPlayer.registryGap ? (
        <p className="mt-2 rounded border border-red-500/60 bg-red-950/60 px-2 py-1 text-[10px] font-bold text-red-200">
          REGISTRY GAP: room.players ✓ but world.snakes ✗
        </p>
      ) : null}
      <p className="mt-2 text-[9px] text-white/35">updated {audit.updatedAt ? new Date(audit.updatedAt).toLocaleTimeString() : "—"}</p>
    </aside>
  );
}

function RoomSection({ audit }: { audit: EngineAuditSnapshot }) {
  const r = audit.room;
  return (
    <AuditSection title="ROOM" status={r.status}>
      <Row label="room=" value={r.code || "—"} />
      <Row label="players=" value={r.players} />
      <Row label="connected=" value={r.connected} />
      <Row label="shouldTick=" value={r.shouldTickWorld} />
      <Row label="globalWorld=" value={r.isGlobalWorld} />
    </AuditSection>
  );
}

function PlayerSection({ audit }: { audit: EngineAuditSnapshot }) {
  const p = audit.localPlayer;
  return (
    <AuditSection title="LOCAL PLAYER" status={p.status}>
      <Row label="deviceId=" value={p.deviceId ? `${p.deviceId.slice(0, 10)}…` : "—"} />
      <Row label="registered=" value={p.registeredInRoom} />
      <Row label="in world state=" value={p.inWorldState} />
      <Row label="in worldRef=" value={p.inWorldRef} />
      <Row label="phase=" value={p.gamePhase} />
      {p.spawnTrace ? <p className="text-violet-300/90">{p.spawnTrace}</p> : <p className="text-red-300/80">PLAYER_CREATE — no trace</p>}
    </AuditSection>
  );
}

function SnakeSection({ audit }: { audit: EngineAuditSnapshot }) {
  const s = audit.localSnake;
  return (
    <AuditSection title="LOCAL SNAKE" status={s.status}>
      <Row label="exists=" value={s.exists} />
      <Row label="alive=" value={s.alive} />
      <Row label="segments=" value={s.segments} />
      <Row label="head=" value={s.head ?? "—"} />
      <Row label="tail=" value={s.tail ?? "—"} />
    </AuditSection>
  );
}

function InputSection({ audit }: { audit: EngineAuditSnapshot }) {
  const i = audit.input;
  return (
    <AuditSection title="INPUT" status={i.status}>
      <Row label="last=" value={i.lastDirection?.toUpperCase() ?? "—"} />
      <Row label="boost=" value={i.boost} />
      <Row label="count=" value={i.count} />
      {i.blockedReason ? <p className="text-red-300">{i.blockedReason}</p> : null}
    </AuditSection>
  );
}

function TickSection({ audit }: { audit: EngineAuditSnapshot }) {
  const t = audit.tick;
  return (
    <AuditSection title="TICK" status={t.status}>
      <Row label="hz=" value={t.hz} />
      <Row label="running=" value={t.running} />
      <Row label="mounted=" value={t.mounted} />
      <Row label="world.tick=" value={t.lastWorldTick} />
      <Row label="advancing=" value={t.worldTickAdvancing} />
      <Row label="sim=" value={t.simCount} />
      {t.blockedReason ? <p className="text-red-300">{t.blockedReason}</p> : null}
      {t.lastError ? <p className="text-red-300">err: {t.lastError}</p> : null}
    </AuditSection>
  );
}

function RenderSection({ audit }: { audit: EngineAuditSnapshot }) {
  const r = audit.render;
  return (
    <AuditSection title="RENDER" status={r.status}>
      <Row label="snakes alive=" value={r.snakesAlive} />
      <Row label="snakes total=" value={r.snakesTotal} />
      <Row label="foods=" value={r.foods} />
      <Row label="ai alive=" value={r.aiAlive} />
      <Row label="local render=" value={r.localWouldRender} />
    </AuditSection>
  );
}
