/** Founder Memory Engine — remembers recommendations & execution */
import type { CompanyTimelineEvent, FounderMemoryState, StoredRecommendation } from "./company-os-types";

const MEMORY_KEY = "replay:founder-memory";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyMemory(): FounderMemoryState {
  return {
    recommendations: [],
    lastVisit: todayKey(),
    companyCompleteness: 68,
    timeline: [],
  };
}

export function loadFounderMemory(): FounderMemoryState {
  if (typeof window === "undefined") return emptyMemory();
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? (JSON.parse(raw) as FounderMemoryState) : emptyMemory();
  } catch {
    return emptyMemory();
  }
}

export function saveFounderMemory(state: FounderMemoryState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function recordRecommendation(rec: Omit<StoredRecommendation, "completed" | "completedAt">): void {
  const mem = loadFounderMemory();
  const exists = mem.recommendations.find((r) => r.date === rec.date && r.id === rec.id);
  if (!exists) {
    mem.recommendations.unshift({ ...rec, completed: false });
    mem.recommendations = mem.recommendations.slice(0, 30);
  }
  mem.lastVisit = todayKey();
  saveFounderMemory(mem);
}

export function completeRecommendation(id: string): FounderMemoryState {
  const mem = loadFounderMemory();
  const rec = mem.recommendations.find((r) => r.id === id);
  if (rec && !rec.completed) {
    rec.completed = true;
    rec.completedAt = new Date().toISOString();
    mem.companyCompleteness = Math.min(99, mem.companyCompleteness + 4);
    mem.timeline.unshift({
      id: `done-${id}-${Date.now()}`,
      date: todayKey(),
      kind: "decision",
      title: "오늘 목표 완료",
      detail: rec.title,
    });
    mem.timeline = mem.timeline.slice(0, 50);
  }
  mem.lastVisit = todayKey();
  saveFounderMemory(mem);
  return mem;
}

export function getPendingFromYesterday(): StoredRecommendation | undefined {
  const mem = loadFounderMemory();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  return mem.recommendations.find((r) => r.date === yKey && !r.completed);
}

export function addTimelineEvent(event: CompanyTimelineEvent): void {
  const mem = loadFounderMemory();
  mem.timeline.unshift(event);
  mem.timeline = mem.timeline.slice(0, 50);
  saveFounderMemory(mem);
}

export function touchVisit(): FounderMemoryState {
  const mem = loadFounderMemory();
  mem.lastVisit = todayKey();
  saveFounderMemory(mem);
  return mem;
}

export function getCompanyCompleteness(): number {
  return loadFounderMemory().companyCompleteness;
}
