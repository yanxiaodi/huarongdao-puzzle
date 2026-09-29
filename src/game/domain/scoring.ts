import type { Difficulty, Level } from "../../data/levelSchema";

const UNLOCK_FRACTION = 0.6;

export type DifficultyUnlockStatus = {
  difficulty: Difficulty;
  prerequisiteDifficulty: Difficulty | null;
  totalLevels: number;
  completedLevels: number;
  requiredLevels: number;
  isUnlocked: boolean;
};

export function rateMoves(steps: number, minSteps: number): 1 | 2 | 3 {
  if (!Number.isSafeInteger(steps) || steps < 0) {
    throw new RangeError("steps must be a non-negative safe integer.");
  }
  if (!Number.isSafeInteger(minSteps) || minSteps <= 0) {
    throw new RangeError("minSteps must be a positive safe integer.");
  }

  const ratio = steps / minSteps;
  if (ratio <= 1.5) {
    return 3;
  }
  if (ratio <= 3) {
    return 2;
  }
  return 1;
}

function getTierLevelIds(
  levels: readonly Level[],
  difficulty: Difficulty,
): Set<number> {
  return new Set(
    levels
      .filter((level) => level.difficulty === difficulty)
      .map((level) => level.id),
  );
}

function hasCompletedUnlockThresholds(
  levels: readonly Level[],
  completedIds: ReadonlySet<number>,
  targetDifficulty: Difficulty,
): boolean {
  for (let tier = 0; tier < targetDifficulty; tier += 1) {
    const tierLevelIds = getTierLevelIds(levels, tier as Difficulty);
    if (tierLevelIds.size === 0) {
      return false;
    }

    const completedCount = [...tierLevelIds].filter((id) =>
      completedIds.has(id),
    ).length;
    const requiredCount = Math.ceil(tierLevelIds.size * UNLOCK_FRACTION);
    if (completedCount < requiredCount) {
      return false;
    }
  }

  return true;
}

export function getDifficultyUnlockStatus(
  levels: readonly Level[],
  completedLevelIds: Iterable<number>,
  difficulty: Difficulty,
): DifficultyUnlockStatus {
  const completedIds = new Set(completedLevelIds);

  if (difficulty === 0) {
    return {
      difficulty,
      prerequisiteDifficulty: null,
      totalLevels: 0,
      completedLevels: 0,
      requiredLevels: 0,
      isUnlocked: true,
    };
  }

  const prerequisiteDifficulty = (difficulty - 1) as Difficulty;
  const prerequisiteIds = getTierLevelIds(levels, prerequisiteDifficulty);
  const completedLevels = [...prerequisiteIds].filter((id) =>
    completedIds.has(id),
  ).length;

  return {
    difficulty,
    prerequisiteDifficulty,
    totalLevels: prerequisiteIds.size,
    completedLevels,
    requiredLevels: Math.ceil(prerequisiteIds.size * UNLOCK_FRACTION),
    isUnlocked:
      prerequisiteIds.size > 0 &&
      hasCompletedUnlockThresholds(levels, completedIds, difficulty),
  };
}
