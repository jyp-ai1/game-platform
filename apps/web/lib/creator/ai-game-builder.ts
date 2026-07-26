/** AI Game Builder — GPT Builder style creator flow. */

export interface BuilderAnswer {
  key: string;
  question: string;
  value: string;
}

export interface BuilderRecommendation {
  templateId: string;
  templateName: string;
  reason: string;
  suggestedTitle: string;
  config: Record<string, string | number>;
}

const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  snake: ["snake", "지렁이", "slither", "worm", "뱀"],
  "2048": ["2048", "merge", "타일", "합치"],
  memory: ["memory", "기억", "카드", "match"],
  puzzle: ["puzzle", "퍼즐", "block"],
  clicker: ["clicker", "idle", "클릭"],
};

/** Parse user idea and recommend template + config. */
export function recommendFromIdea(idea: string): BuilderRecommendation {
  const lower = idea.toLowerCase();
  let templateId = "snake";
  for (const [id, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      templateId = id;
      break;
    }
  }

  const titles: Record<string, string> = {
    snake: idea.includes("Zombie") ? "Zombie Snake" : idea.includes("Space") ? "Space Snake" : `${idea.trim()} Game`,
    "2048": `${idea.trim()} 2048`,
    memory: `${idea.trim()} Memory`,
    puzzle: `${idea.trim()} Puzzle`,
    clicker: `${idea.trim()} Clicker`,
  };

  return {
    templateId,
    templateName: templateId === "snake" ? "Slither Template" : `${templateId} Template`,
    reason: `"${idea}" → ${templateId} genre match`,
    suggestedTitle: titles[templateId] ?? `${idea} Game`,
    config: {
      mapSize: lower.includes("big") || lower.includes("큰") ? "large" : "medium",
      food: lower.includes("zombie") ? "brains" : lower.includes("space") ? "stars" : "apples",
      speed: lower.includes("fast") || lower.includes("빠") ? 8 : 5,
      multiplayer: lower.includes("multi") || lower.includes("친구") ? 1 : 0,
    },
  };
}

export const BUILDER_STEPS = [
  { id: "idea", question: "만들고 싶은 게임은?" },
  { id: "template", question: "AI Template 추천" },
  { id: "map", question: "맵 크기?" },
  { id: "food", question: "먹이/테마?" },
  { id: "speed", question: "속도?" },
  { id: "preview", question: "Preview" },
  { id: "publish", question: "Publish" },
] as const;

export function buildGameSlug(title: string, templateId: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || templateId;
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
