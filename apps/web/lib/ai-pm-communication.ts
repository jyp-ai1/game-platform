/** AI PM Communication Engine — co-founder PM tone & copy patterns */

export const PM_GREETING = "대표님";

export function formatRecommendation(action: string, minutes: number): string {
  return `제가 추천드립니다.\n\n오늘\n\n${action}\n\n${minutes}분이면 충분합니다.`;
}

export function formatPriorityInsight(priority: string): string {
  return `지금은\n\n${priority}\n\n이 우선입니다.`;
}

export function formatBriefingGreeting(): string {
  return `${PM_GREETING}.\n\n좋은 소식입니다.`;
}

export function formatCompletionCelebration(): string {
  return `축하드립니다.\n\n첫 번째 사업 검토가 완료되었습니다.\n\n이제\n\nAI PM이\n\n오늘 해야 할 일을 준비했습니다.`;
}

export function formatConfidence(headline: string, caveat?: string): string {
  if (caveat) {
    return `${headline}\n\n다만\n\n${caveat}`;
  }
  return headline;
}
