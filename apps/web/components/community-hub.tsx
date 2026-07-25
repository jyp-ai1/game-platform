"use client";

import type { Game } from "@game-platform/shared";
import { Badge, Button } from "@game-platform/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { HomeTop3Strip } from "@/components/home-top3-strip";
import { HomeDailyChallengeStrip } from "@/components/home-daily-challenge-strip";
import { listBugReports, submitBugReport } from "@/lib/community-feedback";

export function CommunityHub({ games }: { games: Game[] }) {
  const [bugGame, setBugGame] = useState(games[0]?.slug ?? "");
  const [bugMsg, setBugMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [reports, setReports] = useState<ReturnType<typeof listBugReports>>([]);

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
    <div className="flex flex-col gap-10">
      <HomeTop3Strip games={games} />
      <HomeDailyChallengeStrip />

      <section>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Comments", href: "/games" },
            { title: "Reviews", href: "/games" },
            { title: "Share", href: "/profile" },
            { title: "Report", href: "#bug" },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur transition-colors hover:border-primary/30"
            >
              <p className="font-medium">{item.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="bug" className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur">
        <h2 className="font-semibold">Bug Report</h2>
        <form className="mt-3 space-y-3" onSubmit={handleBug}>
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
            placeholder="무엇이 문제였나요?"
            required
          />
          <Button type="submit" size="sm">
            Submit
          </Button>
          {sent ? <p className="text-xs text-primary">접수됨 (로컬 저장)</p> : null}
        </form>
        {reports.length > 0 ? (
          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            {reports.slice(0, 3).map((r) => (
              <li key={r.id} className="rounded-lg border border-dashed px-3 py-2">
                {r.gameSlug}: {r.message.slice(0, 80)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sprint17 — friends & feeds
        </p>
        <Badge className="mt-2" variant="outline">
          Soon
        </Badge>
      </section>
    </div>
  );
}
