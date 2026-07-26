/** AI Production issues panel for admin. */
import { generateAiIssues } from "@/lib/ai-issue-pipeline";
import { buildAiOpsSummary } from "@/lib/ai-ops-summary";

export function AiIssuePipelinePanel() {
  const ops = buildAiOpsSummary();
  const bugs = ops.bullets.find((b) => b.includes("버그"));
  const bugCount = bugs ? parseInt(bugs.match(/\d+/)?.[0] ?? "0", 10) : 0;
  const issues = generateAiIssues({
    bugCount,
    churnSignal: ops.health === "watch" ? "D1 retention 하락 신호" : null,
  });

  return (
    <section className="rounded-2xl border border-white/10 bg-card/40 p-5">
      <h2 className="font-semibold">AI Issue Pipeline</h2>
      <p className="mt-1 text-sm text-muted-foreground">버그 · 댓글 · 평점 · 이탈 → Issue 자동 생성</p>
      <ul className="mt-4 space-y-3">
        {issues.map((issue) => (
          <li key={issue.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{issue.title}</span>
              <span className={`text-xs ${
                issue.severity === "high" || issue.severity === "critical" ? "text-red-400" : "text-muted-foreground"
              }`}>
                {issue.severity}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">{issue.suggestion}</p>
            {issue.autoFixAvailable && issue.prTitle ? (
              <p className="mt-2 font-mono text-[10px] text-violet-400">PR: {issue.prTitle}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
