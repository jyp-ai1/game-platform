/** Replay Remix — fork existing games into variants (Roblox/Minecraft mod culture). */

import { addCreatorGame, type CreatorGame } from "./creator-store";

export interface RemixVariant {
  id: string;
  label: string;
  suffix: string;
  tags: string[];
  configPatch: Record<string, string | number | boolean>;
}

export const REMIX_VARIANTS: Record<string, RemixVariant[]> = {
  snake: [
    { id: "zombie", label: "Zombie Snake", suffix: "zombie", tags: ["remix", "horror"], configPatch: { theme: "zombie", food: "brains" } },
    { id: "space", label: "Space Snake", suffix: "space", tags: ["remix", "space"], configPatch: { theme: "space", food: "stars" } },
    { id: "multi", label: "Multiplayer Snake", suffix: "multi", tags: ["remix", "multiplayer"], configPatch: { multiplayer: true, maxPlayers: 4 } },
    { id: "boss", label: "Boss Snake", suffix: "boss", tags: ["remix", "boss"], configPatch: { bossMode: true, difficulty: "hard" } },
  ],
  "2048": [
    { id: "hex", label: "Hex 2048", suffix: "hex", tags: ["remix"], configPatch: { grid: "hex" } },
    { id: "time", label: "Time Attack 2048", suffix: "time", tags: ["remix", "speed"], configPatch: { timer: 60 } },
  ],
  memory: [
    { id: "hard", label: "Hard Memory", suffix: "hard", tags: ["remix"], configPatch: { pairs: 20 } },
    { id: "multi", label: "VS Memory", suffix: "vs", tags: ["remix", "multiplayer"], configPatch: { multiplayer: true } },
  ],
};

export function getRemixVariants(baseSlug: string): RemixVariant[] {
  const key = baseSlug.replace(/-plus|-deluxe|-custom.*/, "").split("-")[0] ?? baseSlug;
  return REMIX_VARIANTS[key] ?? REMIX_VARIANTS[baseSlug] ?? [];
}

export function createRemix(baseSlug: string, baseTitle: string, variant: RemixVariant): CreatorGame {
  const slug = `${baseSlug}-${variant.suffix}-${Date.now().toString(36).slice(-3)}`;
  const title = variant.label.includes(baseTitle.split(" ")[0] ?? "") ? variant.label : `${baseTitle} ${variant.label}`;
  return addCreatorGame({
    slug,
    title,
    thumbnailUrl: null,
    tags: [...variant.tags, `remix:${baseSlug}`],
    plays: 0,
    likes: 0,
    status: "published",
    templateId: baseSlug,
  });
}
