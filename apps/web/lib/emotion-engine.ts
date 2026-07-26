/**
 * Emotion Engine — feeling before numbers (Replay OS v4).
 */
import type { StoryEvent } from "@/lib/replay-story-feed";

export type EmotionContext = "home" | "game-end" | "mission-complete" | "streak" | "friend-beat";

export function getTimeGreetingKo(): string {
  const h = new Date().getHours();
  if (h < 6) return "좋은 밤";
  if (h < 12) return "좋은 아침";
  if (h < 18) return "좋은 오후";
  return "좋은 저녁";
}

export function getCelebrationMessage(context: EmotionContext, data?: Record<string, string | number>): string {
  switch (context) {
    case "home":
      return "오늘도 Replay할 준비가 되었어요";
    case "game-end":
      return data?.newBest ? "축하합니다! 이번 달 최고 기록입니다." : "한 판 더? Replay Score를 올릴 수 있어요";
    case "mission-complete":
      return "오늘 미션 완료! 내일도 이어가요 🎉";
    case "streak":
      return `${data?.days ?? 0}일 연속 Replay — 습관이 되었어요!`;
    case "friend-beat":
      return `친구 ${data?.name ?? ""}보다 ${data?.gap ?? 0}점 앞섰습니다!`;
    default:
      return "Replay와 함께";
  }
}

/** Turn timeline events into emotional SNS headlines. */
export function emotionalizeStoryEvent(event: StoryEvent): StoryEvent {
  const emotional: Partial<Record<StoryEvent["type"], string>> = {
    new_best: "🎉 최고 기록을 경신했습니다!",
    score: "플레이 완료 — Replay Score 상승",
    collection: "컬렉션 성장 중",
    challenge: "친구와의 대결",
    mission: event.headline.includes("완료") ? "오늘 미션 완료!" : "미션 진행 중",
    achievement: "새로운 업적 달성!",
    streak: "Streak 유지 중 🔥",
    first_play: "새 게임 탐험 시작",
  };

  return {
    ...event,
    headline: emotional[event.type] ?? event.headline,
  };
}

export function getIdentityEmotion(titleKo: string, streakDays: number): string {
  if (streakDays >= 30) return `${titleKo} — ${streakDays}일째 Replay 중`;
  if (streakDays >= 7) return `${titleKo} 등급으로 성장 중`;
  return `당신은 ${titleKo}입니다`;
}
