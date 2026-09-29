import type { Level } from "../../data/levelSchema";

export type BoardPosition = {
  x: number;
  y: number;
};

export type BoardState = {
  positions: Record<string, BoardPosition>;
};

export type Direction = "up" | "down" | "left" | "right";

export type MoveCommand = {
  pieceId: string;
  direction: Direction;
  distance: number;
};

export type GameSnapshot = {
  levelId: number;
  board: BoardState;
  steps: number;
  undoStack: BoardState[];
  status: "playing" | "won";
};

export interface GameStore {
  getSnapshot(): GameSnapshot;
  subscribe(listener: () => void): () => void;
  move(command: MoveCommand): boolean;
  undo(): void;
  restart(): void;
  startLevel(level: Level): void;
  restore(snapshot: GameSnapshot, canonicalLevel: Level): boolean;
}
