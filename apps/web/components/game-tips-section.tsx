import type { Game } from "@game-platform/shared";

const TIPS_BY_DIFFICULTY: Record<Game["difficulty"], string[]> = {
  EASY: ["짧은 세션으로 가볍게 즐기기 좋습니다.", "모바일 터치 조작을 지원합니다."],
  MEDIUM: ["점수 기록과 랭킹에 도전해 보세요.", "중간 저장으로 이어하기가 가능합니다."],
  HARD: ["패턴을 익히면 점수가 빠르게 오릅니다.", "연습 후 재도전하면 기록 갱신이 쉽습니다."],
};

const TIPS_BY_TAG: Record<string, string> = {
  puzzle: "논리적으로 한 수씩 생각하면 클리어율이 올라갑니다.",
  arcade: "반사신경과 타이밍이 점수에 큰 영향을 줍니다.",
  strategy: "상대 패턴을 읽으면 승률이 높아집니다.",
  sports: "각도와 타이밍을 조절해 연속 득점을 노려보세요.",
  memory: "카드 위치를 기억하는 연습이 핵심입니다.",
  casual: "부담 없이 여러 판을 이어서 플레이해 보세요.",
};

export function buildGameTips(game: Game): string[] {
  const tips = [...TIPS_BY_DIFFICULTY[game.difficulty]];
  for (const tag of game.tags) {
    const tip = TIPS_BY_TAG[tag];
    if (tip && !tips.includes(tip)) tips.push(tip);
  }
  if (game.howToPlay && tips.length < 4) {
    tips.push("플레이 방법 섹션의 조작 안내를 먼저 확인하세요.");
  }
  return tips.slice(0, 4);
}

export function GameTipsSection({ game }: { game: Game }) {
  const tips = buildGameTips(game);
  if (tips.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card/40 p-4">
      <p className="text-sm font-medium text-foreground">플레이 팁</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}
