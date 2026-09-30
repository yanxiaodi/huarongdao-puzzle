import type { AppLocale } from "../i18n/types";

export const LEVEL_SCHEMA_VERSION = 2 as const;
export const BOARD_WIDTH = 4;
export const BOARD_HEIGHT = 5;

export const PIECE_ROLE_IDS = [
  "soldier-bowman",
  "soldier-pikeman",
  "soldier-spearman",
  "soldier-halberdier",
  "soldier-bowman-2",
  "soldier-pikeman-2",
  "soldier-spearman-2",
  "soldier-halberdier-2",
  "soldier-bowman-3",
  "soldier-pikeman-3",
  "soldier-spearman-3",
  "soldier-halberdier-3",
  "soldier-bowman-4",
  "soldier-pikeman-4",
  "soldier-spearman-4",
  "soldier-halberdier-4",
  "general-zhao-yun",
  "general-huang-zhong",
  "general-ma-chao",
  "general-zhang-fei",
  "general-guan-yu",
  "general-wei-yan",
  "cao-cao",
] as const;

export type PieceRoleId = (typeof PIECE_ROLE_IDS)[number];

export function isPieceRoleId(value: unknown): value is PieceRoleId {
  return typeof value === "string" &&
    (PIECE_ROLE_IDS as readonly string[]).includes(value);
}

export type MovementAxis = "horizontal" | "vertical";
export type Difficulty = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Piece = {
  id: string;
  roleId: PieceRoleId;
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
