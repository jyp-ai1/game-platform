/**
 * Feedback provenance — REAL_PLAYER vs QA/AUTOMATION signal separation.
 */
export const FEEDBACK_PROVENANCES = ["REAL_PLAYER", "QA_AUTOMATION"] as const;
export type FeedbackProvenance = (typeof FEEDBACK_PROVENANCES)[number];

const QA_AUTHOR_PREFIXES = ["qa-", "qa_"];

/** Content markers used by automation / migration verify scripts. */
const QA_CONTENT_MARKERS = [
  "wo-qa-",
  "wo-e2e-",
  "m37-qa",
  "m36-verify",
  "fbops-",
  "fi-qa",
  "sync002fix-",
  "sync002-",
];

export function isFeedbackProvenance(value: string): value is FeedbackProvenance {
  return (FEEDBACK_PROVENANCES as readonly string[]).includes(value);
}

/** Detect provenance at insert — preserves QA scripts using QA-* authors. */
export function detectFeedbackProvenance(author: string, content: string): FeedbackProvenance {
  const authorNorm = author.trim().toLowerCase();
  if (QA_AUTHOR_PREFIXES.some((p) => authorNorm.startsWith(p))) {
    return "QA_AUTOMATION";
  }
  const contentNorm = content.toLowerCase();
  if (QA_CONTENT_MARKERS.some((m) => contentNorm.includes(m))) {
    return "QA_AUTOMATION";
  }
  return "REAL_PLAYER";
}

export function isQaAutomationText(text: string): boolean {
  const norm = text.toLowerCase();
  return QA_CONTENT_MARKERS.some((m) => norm.includes(m));
}

export function isRealPlayerProvenance(
  provenance: FeedbackProvenance | undefined | null
): boolean {
  return provenance === "REAL_PLAYER" || provenance == null;
}
