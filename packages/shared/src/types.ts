export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type GameStatus = "ACTIVE" | "COMING_SOON" | "HIDDEN" | "MAINTENANCE";

export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  difficulty: Difficulty;
  status: GameStatus;
  sortOrder: number;
  categoryId: string | null;
  category: Pick<Category, "name" | "slug"> | null;
  isFeatured: boolean;
  tags: string[];
  howToPlay: string | null;
  playCount: number;
  nostalgiaNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  bannerUrl: string | null;
  description: string | null;
  featuredGameId: string | null;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
}
