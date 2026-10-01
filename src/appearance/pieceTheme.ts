import type { Piece } from "../data/levelSchema";

export const PIECE_THEMES = ["text", "portrait", "line-art"] as const;
export type PieceTheme = (typeof PIECE_THEMES)[number];
export type ImagePieceTheme = Exclude<PieceTheme, "text">;

export const IMAGE_PIECE_THEMES: readonly ImagePieceTheme[] = ["portrait", "line-art"];

export const PIECE_ARTWORK_IDS = [
  "11", "12", "13", "14", "15", "16", "17", "18",
  "19", "110", "111", "112", "113", "114", "115", "116",
  "21", "22", "23", "24", "25", "26",
  "31", "32", "33", "34", "35", "36",
  "41",
] as const;

export const PIECE_THEME_PREVIEW_ARTWORK = {
  caoCao: "41",
  general: "21",
  soldier: "11",
} as const;

const SOLDIER_ARTWORK_BY_ROLE: Partial<Record<Piece["roleId"], string>> = {
  "soldier-bowman": "11",
  "soldier-pikeman": "12",
  "soldier-spearman": "13",
  "soldier-halberdier": "14",
  "soldier-bowman-2": "15",
  "soldier-pikeman-2": "16",
  "soldier-spearman-2": "17",
  "soldier-halberdier-2": "18",
  "soldier-bowman-3": "19",
  "soldier-pikeman-3": "110",
  "soldier-spearman-3": "111",
  "soldier-halberdier-3": "112",
  "soldier-bowman-4": "113",
  "soldier-pikeman-4": "114",
  "soldier-spearman-4": "115",
  "soldier-halberdier-4": "116",
};

const VERTICAL_GENERAL_ARTWORK_BY_ROLE: Partial<Record<Piece["roleId"], string>> = {
  "general-zhao-yun": "21",
  "general-huang-zhong": "22",
  "general-ma-chao": "23",
  "general-zhang-fei": "24",
  "general-guan-yu": "25",
  "general-wei-yan": "26",
};

const HORIZONTAL_GENERAL_ARTWORK_BY_ROLE: Partial<Record<Piece["roleId"], string>> = {
  "general-guan-yu": "31",
  "general-zhang-fei": "32",
  "general-ma-chao": "33",
  "general-huang-zhong": "34",
  "general-zhao-yun": "35",
  "general-wei-yan": "36",
};

export function isPieceTheme(value: unknown): value is PieceTheme {
  return typeof value === "string" && (PIECE_THEMES as readonly string[]).includes(value);
}

export function getPieceArtworkId(piece: Piece): string {
  if (piece.roleId === "cao-cao") return "41";

  const soldierArtwork = SOLDIER_ARTWORK_BY_ROLE[piece.roleId];
  if (soldierArtwork) return soldierArtwork;

  const generalArtwork = piece.width === 1 && piece.height === 2
    ? VERTICAL_GENERAL_ARTWORK_BY_ROLE[piece.roleId]
    : piece.width === 2 && piece.height === 1
      ? HORIZONTAL_GENERAL_ARTWORK_BY_ROLE[piece.roleId]
      : undefined;
  if (generalArtwork) return generalArtwork;

  throw new Error(`No piece artwork mapping exists for ${piece.roleId} (${piece.width}x${piece.height}).`);
}

export function getPieceArtworkUrl(theme: ImagePieceTheme, artworkId: string): string {
  return `${import.meta.env.BASE_URL}images/piece-themes/${theme}/smgh${artworkId}.jpg`;
}

export function getPieceArtworkTextureKey(theme: ImagePieceTheme, artworkId: string): string {
  return `piece-artwork-${theme}-smgh${artworkId}`;
}
