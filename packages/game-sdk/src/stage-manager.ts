/**
 * Sprint 14 — Stage Framework.
 * Games implement `difficulty(stageIndex)` only; manager handles save/advance.
 */
import {
  loadGameProgress,
  recordStageClear as persistStageClear,
  type GameProgressStats,
} from "./game-progress";

export interface StageDefinition<TParams = Record<string, unknown>> {
  stageIndex: number;
  label: string;
  params: TParams;
}

export interface StageManagerOptions<TParams> {
  gameSlug: string;
  stages: StageDefinition<TParams>[];
  /** Per-game difficulty curve — only override this in game code. */
  difficulty?: (stageIndex: number, params: TParams) => TParams;
}

export class StageManager<TParams = Record<string, unknown>> {
  readonly slug: string;
  readonly stages: StageDefinition<TParams>[];
  private readonly difficultyFn: (stageIndex: number, params: TParams) => TParams;

  constructor(options: StageManagerOptions<TParams>) {
    this.slug = options.gameSlug;
    this.stages = options.stages;
    this.difficultyFn =
      options.difficulty ?? ((_index, params) => params);
  }

  get finalStageIndex(): number {
    return this.stages.length;
  }

  getStage(stageIndex: number): StageDefinition<TParams> {
    const idx = Math.max(1, Math.min(stageIndex, this.stages.length));
    const base = this.stages[idx - 1] ?? this.stages[0]!;
    return {
      ...base,
      params: this.difficultyFn(idx, base.params),
    };
  }

  hasNextStage(stageIndex: number): boolean {
    return stageIndex < this.finalStageIndex;
  }

  getProgress(): GameProgressStats {
    return loadGameProgress(this.slug);
  }

  getResumeStage(): number {
    return loadGameProgress(this.slug).currentStage;
  }

  recordClear(stageIndex: number, score: number): GameProgressStats {
    return persistStageClear(this.slug, stageIndex, score);
  }
}

export function createStageManager<TParams = Record<string, unknown>>(
  options: StageManagerOptions<TParams>
): StageManager<TParams> {
  return new StageManager(options);
}
