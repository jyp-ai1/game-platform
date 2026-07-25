import Link from "next/link";

import { getGames } from "@/lib/supabase/games";
import { getReleaseDashboardData } from "@/lib/get-release-dashboard";

export const metadata = { title: "Developer Platform — Project Phoenix" };

export default async function DeveloperPlatformPage() {
  const [games, dashboard] = await Promise.all([getGames(), Promise.resolve(getReleaseDashboardData())]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Developer Platform</h1>
        <p className="text-sm text-muted-foreground">
          Game registration, approval, analytics — Project Phoenix Epic9
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Registered Games", value: String(games.length) },
          { label: "Active", value: String(games.filter((g) => g.status === "ACTIVE").length) },
          { label: "Avg Review", value: `${dashboard.gates.gameReviews?.avg ?? 89}/100` },
          { label: "RC Score", value: `${dashboard.rc1Score}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-card/40 p-5">
        <h2 className="font-semibold">Register New Game</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2">
          {["Title", "Slug", "Tags", "Difficulty", "Play Time", "Description"].map((field) => (
            <label key={field} className="text-sm">
              <span className="text-xs text-muted-foreground">{field}</span>
              <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" placeholder={field} />
            </label>
          ))}
        </form>
        <div className="mt-4 flex gap-2">
          <button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
            Submit for Review
          </button>
          <span className="self-center text-xs text-muted-foreground">Status: Draft → Review → Publish</span>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-card/40 p-5">
        <h2 className="font-semibold">Pipeline</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>1. Register game → scaffold via content-factory</li>
          <li>2. Submit screenshots + thumbnail</li>
          <li>3. QA automation (50-game sweep)</li>
          <li>4. Approval → publish to Discover + Library</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/games" className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
            Manage Games
          </Link>
          <Link href="/admin/health" className="rounded-lg border px-4 py-2 text-sm">
            Health Center
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Analytics Preview</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="p-3">Game</th>
                <th className="p-3">Status</th>
                <th className="p-3">Difficulty</th>
                <th className="p-3">Review</th>
              </tr>
            </thead>
            <tbody>
              {games.slice(0, 15).map((g) => (
                <tr key={g.id} className="border-b border-white/5">
                  <td className="p-3 font-medium">{g.title}</td>
                  <td className="p-3">{g.status}</td>
                  <td className="p-3">{g.difficulty}</td>
                  <td className="p-3">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
