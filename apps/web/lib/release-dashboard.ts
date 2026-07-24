export type ReleaseDashboardGate = {
  status: string;
  detail?: string;
  count?: number;
  avg?: number;
};

export type ReleaseDashboard = {
  generatedAt: string;
  branch: string;
  playable: number;
  rc1Score: number;
  overall: string;
  gates: Record<string, ReleaseDashboardGate>;
  predictedTop10: Array<{ slug: string; title: string; predictedScore: number }>;
  predictedBottom10: Array<{ slug: string; title: string; predictedScore: number }>;
  difficultyCurve: { easyPct: number; normalPct: number; hardPct: number } | null;
  games: Array<{
    slug: string;
    status?: string;
    metadata?: string;
    thumbnail?: string;
    reviewScore?: number;
    grade?: string;
    loadMs?: number;
    loading?: string;
    missing?: string[];
  }>;
};
