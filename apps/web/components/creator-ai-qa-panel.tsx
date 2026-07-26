"use client";

import { Button } from "@game-platform/ui";
import { useState } from "react";

import {
  createAutoFixPR,
  generateCoDevSuggestions,
  runAIPipeline,
  type QACheckResult,
} from "@/lib/creator/ai-qa-pipeline";

export function CreatorAiQaPanel() {
  const [checks, setChecks] = useState<QACheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  async function handleRun() {
    setRunning(true);
    const result = await runAIPipeline("my-game");
    setChecks(result.checks);
    setScore(result.score);
    setRunning(false);
  }

  const suggestions = generateCoDevSuggestions("my-game");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">AI QA</h1>
        <p className="text-sm text-muted-foreground">업로드 → AI 자동 검사 → Issue 생성 → Publish</p>
      </div>

      <Button onClick={handleRun} disabled={running}>
        {running ? "Running…" : "Run QA Pipeline"}
      </Button>

      {score != null ? (
        <p className="text-lg font-bold">Score: {score}/100 {score >= 75 ? "✓ PASS" : "— Review needed"}</p>
      ) : null}

      {checks.length > 0 ? (
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.id} className="flex justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
              <span>{c.label}</span>
              <span className={c.status === "pass" ? "text-emerald-400" : "text-amber-400"}>{c.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <h2 className="font-semibold">AI Co-Developer</h2>
        <p className="mt-1 text-sm text-muted-foreground">댓글 · 버그 → AI 분석 → 자동 수정 PR</p>
        <ul className="mt-4 space-y-3">
          {suggestions.map((s) => (
            <li key={s.id} className="rounded-xl border border-white/10 bg-card/50 p-4">
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              {s.autoFixAvailable ? (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    const pr = createAutoFixPR(s);
                    alert(`PR created: ${pr.prUrl}\nStatus: ${pr.status}`);
                  }}
                >
                  Generate Fix PR
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
