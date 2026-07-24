import type { Difficulty } from "@game-platform/shared";

import { formatClearTime, getGameBalanceMeta } from "@/lib/game-balance";
import { formatDifficulty } from "@/lib/difficulty";
import { PLAYABLE_SLUGS } from "@/lib/playable-games";
import { getGames } from "@/lib/supabase/games";

export const metadata = { title: "Games — Balance" };

export default async function AdminGamesPage() {
  const games = await getGames({ includeComingSoon: true });
  const playable = new Set<string>(PLAYABLE_SLUGS);
  const rows = games
    .filter((g) => playable.has(g.slug))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Games — Balance Metadata</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          50 playable games · difficulty · play time · recommended score · clear time
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground">
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Difficulty</th>
              <th className="px-4 py-3 font-medium">Play Time</th>
              <th className="px-4 py-3 font-medium tabular-nums">Rec. Score</th>
              <th className="px-4 py-3 font-medium">Clear Time</th>
              <th className="px-4 py-3 font-medium">Session</th>
              <th className="px-4 py-3 font-medium tabular-nums">Plays</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((game) => {
              const meta = getGameBalanceMeta(game.slug, game.difficulty as Difficulty);
              return (
                <tr key={game.slug} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{game.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{game.slug}</span>
                  </td>
                  <td className="px-4 py-2.5">{formatDifficulty(game.difficulty)}</td>
                  <td className="px-4 py-2.5">{meta.playTimeLabel}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {meta.recommendedScore.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">{formatClearTime(meta.clearTimeSec)}</td>
                  <td className="px-4 py-2.5 capitalize">{meta.sessionType}</td>
                  <td className="px-4 py-2.5 tabular-nums">{game.playCount.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
