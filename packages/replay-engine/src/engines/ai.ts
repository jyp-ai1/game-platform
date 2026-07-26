/**
 * AI Production Engine — bug/comment/rating/churn → Issue (L2 DoD).
 */
import { emitSimple } from "../event-bus";

const STORAGE_KEY = "play29:ai-issues";
const MAX = 30;

export type AiIssueSeverity = "low" | "medium" | "high" | "critical";
export type AiIssueSource = "bug" | "comment" | "rating" | "churn" | "qa";

export interface AiIssue {
  id: string;
  title: string;
  source: AiIssueSource;
  severity: AiIssueSeverity;
  suggestion: string;
  autoFixAvailable: boolean;
  prTitle?: string;
  createdAt: string;
}

export interface AiIssueContext {
  bugCount?: number;
  lowRatingGames?: string[];
  churnSignal?: string | null;
  commentFlags?: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function readAll(): AiIssue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AiIssue[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: AiIssue[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX)));
  listeners.forEach((fn) => fn());
}

export function subscribeAiIssues(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAiIssues(): AiIssue[] {
  return readAll();
}

export function pushAiIssue(issue: Omit<AiIssue, "id" | "createdAt">): AiIssue {
  const entry: AiIssue = {
    ...issue,
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  writeAll([entry, ...readAll()]);
  emitSimple("ai:qa-result", { source: issue.source, severity: issue.severity }, "ai");
  return entry;
}

/** Generate issues from ops signals — bug · comment · rating · churn. */
export function generateAiIssues(ctx: AiIssueContext): AiIssue[] {
  const issues: AiIssue[] = [];
  const now = new Date().toISOString();

  if ((ctx.bugCount ?? 0) > 0) {
    issues.push({
      id: `gen-bug-${Date.now()}`,
      title: `${ctx.bugCount}건 버그 리포트`,
      source: "bug",
      severity: ctx.bugCount! > 3 ? "high" : "medium",
      suggestion: "AI QA pipeline 재실행 · 영향 게임 우선 패치",
      autoFixAvailable: true,
      prTitle: "fix(platform): address reported bugs",
      createdAt: now,
    });
  }

  if ((ctx.commentFlags ?? 0) > 0) {
    issues.push({
      id: `gen-comment-${Date.now()}`,
      title: `${ctx.commentFlags}건 댓글 모더레이션 필요`,
      source: "comment",
      severity: "medium",
      suggestion: "부정 댓글 · 스팸 검토 · Creator 알림",
      autoFixAvailable: false,
      createdAt: now,
    });
  }

  for (const game of ctx.lowRatingGames ?? []) {
    issues.push({
      id: `gen-rating-${game}`,
      title: `${game} 평점 하락`,
      source: "rating",
      severity: "medium",
      suggestion: "첫 화면 이탈률 · 난이도 곡선 검토",
      autoFixAvailable: false,
      createdAt: now,
    });
  }

  if (ctx.churnSignal) {
    issues.push({
      id: `gen-churn-${Date.now()}`,
      title: ctx.churnSignal,
      source: "churn",
      severity: "high",
      suggestion: "Notification · Streak · Mission hook 강화",
      autoFixAvailable: false,
      createdAt: now,
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: "gen-ok",
      title: "오늘 긴급 Issue 없음",
      source: "qa",
      severity: "low",
      suggestion: "Flagship Snake.io · Cross-device transport P0 유지",
      autoFixAvailable: false,
      createdAt: now,
    });
  }

  return issues;
}

/** Run pipeline — generate + persist new issues. */
export function runAiIssuePipeline(ctx: AiIssueContext): AiIssue[] {
  const generated = generateAiIssues(ctx);
  writeAll([...generated, ...readAll()].slice(0, MAX));
  return generated;
}

export const AI = {
  getIssues: getAiIssues,
  generate: generateAiIssues,
  run: runAiIssuePipeline,
  push: pushAiIssue,
  subscribe: subscribeAiIssues,
};
