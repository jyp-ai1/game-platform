"use client";

import { useEffect, useState } from "react";

import { getMultiplayerSupabase } from "@game-platform/multiplayer-sdk";

interface MpStats {
  online: number;
  rooms: number;
  players: number;
  playing: number;
  avg_latency_ms: number;
  disconnects_1h: number;
  top_games: { game_slug: string; rooms: number }[];
  checked_at: string;
}

/** Realtime Operations Dashboard — /admin/os */
export function MpRealtimeDashboard() {
  const [stats, setStats] = useState<MpStats | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getMultiplayerSupabase();
      if (!supabase) return;
      const { data } = await supabase.rpc("get_mp_realtime_stats");
      if (data) setStats(data as MpStats);
    }
    void load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  if (!stats) {
    return (
      <section className="rounded-2xl border border-white/10 bg-card/40 p-5">
        <h2 className="font-semibold">Realtime Dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Supabase Realtime — `0028_replay_multiplayer.sql` 마이그레이션 적용 후 활성화
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-card/40 p-5">
      <h2 className="font-semibold">Realtime Dashboard</h2>
      <p className="mt-1 text-xs text-muted-foreground">15초 갱신 · Cross-device Multiplayer</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Online" value={stats.online} />
        <Stat label="Rooms" value={stats.rooms} />
        <Stat label="Players" value={stats.players} />
        <Stat label="Playing" value={stats.playing} />
        <Stat label="Latency" value={`${stats.avg_latency_ms}ms`} />
        <Stat label="Disconnect (1h)" value={stats.disconnects_1h} alert={stats.disconnects_1h > 0} />
      </div>
      {stats.top_games.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Top Games</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {stats.top_games.map((g) => (
              <li key={g.game_slug}>{g.game_slug} — {g.rooms} rooms</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${alert ? "border-red-500/30" : "border-white/10"}`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${alert ? "text-red-400" : ""}`}>{value}</p>
    </div>
  );
}
