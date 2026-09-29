import type { AppLocale } from "../i18n/types";

export const LEVEL_SCHEMA_VERSION = 1 as const;
export const BOARD_WIDTH = 4;
export const BOARD_HEIGHT = 5;

export type MovementAxis = "horizontal" | "vertical";
export type Difficulty = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Piece = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  axes: MovementAxis[];
};

export type Level = {
  id: number;
  targetPieceId: string;
  names: Record<AppLocale, string>;
  difficulty: Difficulty;
  minSteps: number;
  pieces: Piece[];
};

export type LevelCatalog = {
  schemaVersion: typeof LEVEL_SCHEMA_VERSION;
  levels: Level[];
};