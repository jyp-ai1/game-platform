/** AI QA Pipeline — automated game submission checks. */

export type QACheckId =
  | "loading" | "memory" | "fps" | "mobile" | "responsive" | "errors"
  | "buttons" | "difficulty" | "ads" | "ux";

export interface QACheckResult {
  id: QACheckId;
  label: string;
  status: "pending" | "running" | "pass" | "fail" | "warn";
  message: string;
  score?: number;
}

export interface QAPipelineResult {
  passed: boolean;
  score: number;
  checks: QACheckResult[];
  issues: QAIssue[];
  recommendedDifficulty: "EASY" | "MEDIUM" | "HARD";
  completedAt: string;
}

export interface QAIssue {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  suggestion: string;
}

const CHECK_DEFS: { id: QACheckId; label: string }[] = [
  { id: "loading", label: "Loading" },
  { id: "memory", label: "Memory Leak" },
  { id: "fps", label: "FPS" },
  { id: "mobile", label: "Mobile" },
  { id: "responsive", label: "Responsive" },
  { id: "errors", label: "Error" },
  { id: "buttons", label: "Buttons" },
  { id: "difficulty", label: "Difficulty" },
  { id: "ads", label: "Ad Placement" },
  { id: "ux", label: "UX" },
];

/** Run full AI QA pipeline (simulated). */
export async function runAIPipeline(gameSlug: string): Promise<QAPipelineResult> {
  const checks: QACheckResult[] = [];

  for (const def of CHECK_DEFS) {
    checks.push({ id: def.id, label: def.label, status: "running", message: "Checking…" });
    await delay(400);
    const pass = Math.random() > 0.15;
    checks[checks.length - 1] = {
      id: def.id,
      label: def.label,
      status: pass ? "pass" : def.id === "fps" ? "warn" : "fail",
      message: pass ? "PASS" : def.id === "fps" ? "55 FPS avg — acceptable" : "Issue detected",
      score: pass ? 100 : def.id === "fps" ? 85 : 60,
    };
  }

  const issues: QAIssue[] = [];
  const failed = checks.filter((c) => c.status === "fail" || c.status === "warn");
  if (failed.some((c) => c.id === "fps")) {
    issues.push({
      id: "i1",
      severity: "low",
      title: "FPS drops on mobile Safari",
      suggestion: "Reduce particle count on low-end devices",
    });
  }
  if (failed.some((c) => c.id === "responsive")) {
    issues.push({
      id: "i2",
      severity: "medium",
      title: "Layout overflow at 320px width",
      suggestion: "Add min-width constraints to game canvas",
    });
  }

  const score = Math.round(checks.reduce((s, c) => s + (c.score ?? 100), 0) / checks.length);
  return {
    passed: score >= 75 && !checks.some((c) => c.status === "fail"),
    score,
    checks,
    issues,
    recommendedDifficulty: score >= 90 ? "MEDIUM" : "EASY",
    completedAt: new Date().toISOString(),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** AI Co-Developer — analyze comments/bugs and suggest fixes. */
export interface CoDevSuggestion {
  id: string;
  type: "bug" | "balance" | "ux" | "performance";
  title: string;
  description: string;
  autoFixAvailable: boolean;
  prTitle: string;
}

export function generateCoDevSuggestions(gameSlug: string): CoDevSuggestion[] {
  return [
    {
      id: "cd1",
      type: "ux",
      title: "18% drop-off on first screen",
      description: "Players leave before starting — tutorial may be too long.",
      autoFixAvailable: true,
      prTitle: `fix(${gameSlug}): shorten intro tutorial`,
    },
    {
      id: "cd2",
      type: "bug",
      title: "Score not saving on Safari",
      description: "localStorage quota exceeded on iOS 17.",
      autoFixAvailable: true,
      prTitle: `fix(${gameSlug}): graceful save fallback`,
    },
  ];
}

export function createAutoFixPR(suggestion: CoDevSuggestion): { prUrl: string; status: "pending_approval" } {
  return {
    prUrl: `https://github.com/jyp-ai1/game-platform/pull/auto-${suggestion.id}`,
    status: "pending_approval",
  };
}
