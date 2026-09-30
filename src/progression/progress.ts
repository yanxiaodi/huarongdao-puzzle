import type { AppLocale } from "../i18n/types";
import type { GameSnapshot, MoveCommand } from "../game/domain/types";

export const PROGRESS_SCHEMA_VERSION = 1 as const;

export type StarRating = 1 | 2 | 3;

export type UserSettings = {
  soundEnabled: boolean;
  locale: AppLocale;
};

export type SavedGame = {
  snapshot: GameSnapshot;
  openedAt: string;
};

export type CompletionRecord = {
  id: string;
  levelId: number;
  steps: number;
  moves: MoveCommand[];
  stars: StarRating;
  completedAt: string;
};

export type ProgressSnapshot = {
  schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  gamesByLevel: Record<string, SavedGame>;
  bestStars: Record<string, StarRating>;
  favorites: number[];
  completionRecords: CompletionRecord[];
  settings: UserSettings;
};

export function createEmptyProgressSnapshot(locale: AppLocale): ProgressSnapshot {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    gamesByLevel: {},
    bestStars: {},
    favorites: [],
    completionRecords: [],
    settings: { soundEnabled: true, locale },
  };
}

export function cloneProgressSnapshot(snapshot: ProgressSnapshot): ProgressSnapshot {
  const gamesByLevel: ProgressSnapshot["gamesByLevel"] = {};
  for (const [levelId, savedGame] of Object.entries(snapshot.gamesByLevel)) {
    gamesByLevel[levelId] = {
      openedAt: savedGame.openedAt,
      snapshot: {
        ...savedGame.snapshot,
        board: {
          positions: Object.fromEntries(
            Object.entries(savedGame.snapshot.board.positions).map(([pieceId, position]) => [
              pieceId,
              { ...position },
            ]),
          ),
        },
        moves: savedGame.snapshot.moves.map((move) => ({ ...move })),
        undoStack: savedGame.snapshot.undoStack.map((board) => ({
          positions: Object.fromEntries(
            Object.entries(board.positions).map(([pieceId, position]) => [pieceId, { ...position}]),
          ),
        })),
      },
    };
  }

  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    gamesByLevel,
    bestStars: { ...snapshot.bestStars },
    favorites: [...snapshot.favorites],
    completionRecords: snapshot.completionRecords.map((record) => ({
      ...record,
      moves: record.moves.map((move) => ({ ...move })),
    })),
    settings: { ...snapshot.settings },
  };
}

export function getMostRecentUnfinishedLevelId(
  snapshot: ProgressSnapshot,
): number | null {
  const mostRecent = Object.entries(snapshot.gamesByLevel).sort(
    ([, left], [, right]) => Date.parse(right.openedAt) - Date.parse(left.openedAt),
  )[0];
  return mostRecent ? Number(mostRecent[0]) : null;
}

export function getCompletionRecordsForLevel(
  snapshot: ProgressSnapshot,
  levelId: number,
): CompletionRecord[] {
  return snapshot.completionRecords
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.levelId === levelId)
    .sort((left, right) => {
      if (left.record.steps !== right.record.steps) return left.record.steps - right.record.steps;
      const timeDifference = Date.parse(right.record.completedAt) - Date.parse(left.record.completedAt);
      return timeDifference !== 0 ? timeDifference : right.index - left.index;
    })
    .map(({ record }) => record);
}
