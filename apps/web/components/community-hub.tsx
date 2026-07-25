"use client";

import type { Game } from "@game-platform/shared";
import { Button } from "@game-platform/ui";
import { Heart } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { CommunityActivityFeed } from "@/components/community-activity-feed";
import { CommunityCommentsPanel } from "@/components/community-comments-panel";
import {
  CommunityDailyRanking,
  CommunityTopPlayers,
} from "@/components/community-leaderboards";
import { CommunityRatingsStrip } from "@/components/community-ratings-panel";
import { ensureCommunityMockData } from "@/lib/community-mock";
import { listBugReports, submitBugReport } from "@/lib/community-store";

export function CommunityHub({ games }: { games: Game[] }) {
  const [bugGame, setBugGame] = useState(games[0]?.slug ?? "");
  const [bugMsg, setBugMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [reports, setReports] = useState<ReturnType<typeof listBugReports>>([]);

  useEffect(() => {
    ensureCommunityMockData();
    refreshReports();
  }, []);

  function refreshReports() {
    setReports(listBugReports());
  }

  function handleBug(e: FormEvent) {
    e.preventDefault();
    submitBugReport(bugGame, bugMsg);
    setBugMsg("");
    setSent(true);
    refreshReports();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <CommunityDailyRanking games={games} />
        <CommunityTopPlayers games={games} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CommunityCommentsPanel games={games} />
        <CommunityRatingsStrip games={games} />
      </div>

      <section id="bug" className="rounded-3xl border border-white/10 bg-card/50 p-6 backdrop-blur">
        <div className="flex items-center gap-2">
          <Heart className="size-4 text-destructive" />
          <h2 className="font-semibold">Bug Report</h2>
        </div>
        <form className="mt-4 space-y-3" onSubmit={handleBug}>
          <select
            className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm"
            value={bugGame}
            onChange={(e) => setBugGame(e.target.value)}
            aria-label="게임 선택"
          >
            {games.slice(0, 20).map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.title}
              </option>
            ))}
          </select>
          <textarea
            className="w-full rounded-xl border bg-background/60 px-3 py-2 text-sm"
            rows={3}
            value={bugMsg}
            onChange={(e) => setBugMsg(e.target.value)}
            placeholder="…"
            required
          />
          <Button type="submit" size="sm">
            Submit
          </Button>
          {sent ? <p className="text-xs text-primary">OK</p> : null}
        </form>
        {reports.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {reports.slice(0, 5).map((r) => (
              <li key={r.id} className="rounded-xl border border-white/5 px-3 py-2">
                <span className="text-primary">{r.gameSlug}</span> · {r.message.slice(0, 100)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <CommunityActivityFeed />
    </div>
  );
}
