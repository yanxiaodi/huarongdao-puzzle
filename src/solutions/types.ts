import type { BoardPosition, GameStore, MoveCommand } from "../game/domain/types";

export const SOLUTION_SCHEMA_VERSION = 1 as const;

export type Solution = {
  levelId: number;
  moves: MoveCommand[];
};

export type SolutionAccess = "granted" | "locked" | "unavailable";

export type PlaybackStatus =
  | "playing"
  | "paused"
  | "completed"
  | "locked"
  | "unavailable"
  | "invalid";

export type PlaybackSnapshot = {
  status: PlaybackStatus;
  positions: Record<string, BoardPosition> | null;
  currentStep: number;
  totalSteps: number;
  intervalMs: number;
  message?: string;
};

export interface SolutionPlaybackController {
  getGameStore(): GameStore;
  getSnapshot(): PlaybackSnapshot;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<PlaybackSnapshot>;
  play(): PlaybackSnapshot;
  pause(): PlaybackSnapshot;
  stepForward(): PlaybackSnapshot;
  stepBack(): PlaybackSnapshot;
  faster(): PlaybackSnapshot;
  slower(): PlaybackSnapshot;
  exit(): PlaybackSnapshot;
  dispose(): void;
}
