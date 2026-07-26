/** AI PM Experience 2.0 — shared types */

export type ThinkingStepStatus = "pending" | "running" | "done";

export interface ThinkingStep {
  id: string;
  label: string;
  why: string;
  founderValue: string;
  etaSeconds: number;
  status: ThinkingStepStatus;
}

export type MicroQuestionKind = "target_customer" | "pricing" | "primary_goal";

export interface MicroQuestionOption {
  id: string;
  label: string;
}

export interface MicroQuestion {
  id: string;
  kind: MicroQuestionKind;
  prompt: string;
  options: MicroQuestionOption[];
  answered?: string;
}

export interface TodayHero {
  minutesNeeded: number;
  reason: string;
  expectedEffect: string;
  beforePercent: number;
  afterPercent: number;
  recommendedAction: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface ActionProposal {
  title: string;
  minutes: number;
  expectedEffect: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface BriefingBeat {
  greeting: string;
  goodNews: string;
  biggestRisk: string;
  todayRecommendation: string;
  minutesNeeded: number;
  expectedEffect: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface ConfidenceMessage {
  headline: string;
  body: string;
  priority: string;
}

export interface AiPmSession {
  generatedAt: string;
  thinkingSteps: ThinkingStep[];
  microQuestions: MicroQuestion[];
  hero: TodayHero;
  briefing: BriefingBeat;
  confidence: ConfidenceMessage;
  primaryAction: ActionProposal;
  founderInputsApplied: string[];
}
