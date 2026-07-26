/** AI CEO Office / Company OS — shared types */

export type CompanyPillar = "product" | "users" | "revenue" | "risk";

export type PillarTrend = "up" | "down" | "stable";

export interface CompanyPillarStatus {
  pillar: CompanyPillar;
  label: string;
  stars: 1 | 2 | 3 | 4 | 5;
  statusLabel: string;
  trend: PillarTrend;
}

export interface LivingInsight {
  id: string;
  message: string;
  trend: PillarTrend;
  cause?: string;
  suggestion?: string;
}

export interface DialogueLine {
  id: string;
  text: string;
  pauseMs?: number;
}

export interface OneFocus {
  id: string;
  title: string;
  minutes: number;
  expectedEffect: string;
  successMetric: string;
  ctaLabel: string;
  ctaHref: string;
  rationale: string;
  decisionNote: string;
}

export interface MemoryReminder {
  date: string;
  action: string;
  completed: boolean;
  message: string;
}

export interface ActionFeedback {
  headline: string;
  body: string;
  completenessBefore: number;
  completenessAfter: number;
  nextFocusHint?: string;
}

export interface CompanyTimelineEvent {
  id: string;
  date: string;
  kind: "deploy" | "feature" | "kpi" | "feedback" | "decision";
  title: string;
  detail?: string;
}

export interface DailyBriefingStructure {
  yesterdayResult: string;
  todayChanges: string[];
  oneFocus: OneFocus;
  topRisks: string[];
  expectedMinutes: number;
}

export interface CeoOfficeSession {
  generatedAt: string;
  morningGreeting: string;
  pillars: CompanyPillarStatus[];
  livingInsights: LivingInsight[];
  dialogue: DialogueLine[];
  oneFocus: OneFocus;
  memoryReminder?: MemoryReminder;
  topRisks: string[];
  companyCompleteness: number;
  timeline: CompanyTimelineEvent[];
  dailyBriefing: DailyBriefingStructure;
}

export interface StoredRecommendation {
  id: string;
  date: string;
  title: string;
  ctaHref: string;
  completed: boolean;
  completedAt?: string;
}

export interface FounderMemoryState {
  recommendations: StoredRecommendation[];
  lastVisit: string;
  companyCompleteness: number;
  timeline: CompanyTimelineEvent[];
}
