/** Template Marketplace — starter game templates. */

export interface GameTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  estimatedTime: string;
  downloads: number;
  tags: string[];
  featured: boolean;
}

export const GAME_TEMPLATES: GameTemplate[] = [
  { id: "blank", name: "Blank", slug: "blank", description: "Start from scratch with Replay SDK wired.", category: "starter", difficulty: "EASY", estimatedTime: "—", downloads: 0, tags: ["blank"], featured: false },
  { id: "snake", name: "Snake Template", slug: "snake", description: "Classic snake with score, stages, and SDK hooks.", category: "arcade", difficulty: "EASY", estimatedTime: "30 min", downloads: 1240, tags: ["arcade", "classic"], featured: true },
  { id: "2048", name: "2048 Template", slug: "2048", description: "Tile merge puzzle with save/resume.", category: "puzzle", difficulty: "MEDIUM", estimatedTime: "45 min", downloads: 890, tags: ["puzzle", "merge"], featured: true },
  { id: "memory", name: "Memory Template", slug: "memory", description: "Card flip memory game with collection.", category: "puzzle", difficulty: "EASY", estimatedTime: "25 min", downloads: 670, tags: ["memory", "casual"], featured: true },
  { id: "clicker", name: "Clicker Template", slug: "clicker", description: "Idle clicker with upgrades and missions.", category: "casual", difficulty: "EASY", estimatedTime: "20 min", downloads: 450, tags: ["idle", "clicker"], featured: false },
  { id: "puzzle", name: "Puzzle Template", slug: "puzzle", description: "Grid puzzle with stage progression.", category: "puzzle", difficulty: "MEDIUM", estimatedTime: "40 min", downloads: 520, tags: ["puzzle", "stages"], featured: false },
];

export function getTemplate(id: string): GameTemplate | null {
  return GAME_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function cloneTemplate(templateId: string, customTitle?: string): { slug: string; title: string; templateId: string } {
  const t = getTemplate(templateId);
  const base = t?.slug === "blank" ? "my-game" : `${t?.slug ?? "game"}-custom`;
  const slug = `${base}-${Date.now().toString(36).slice(-4)}`;
  return {
    slug,
    title: customTitle ?? `${t?.name ?? "My Game"} Copy`,
    templateId,
  };
}
