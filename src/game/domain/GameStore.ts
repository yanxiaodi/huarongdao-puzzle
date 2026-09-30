import type { Level } from "../../data/levelSchema";
import {
  applyMove,
  createInitialBoardState,
  hasWon,
  isValidBoardState,
  isValidLevelDefinition,
} from "./rules";
import type {
  BoardState,
  GameSnapshot,
  GameStore,
  MoveCommand,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cloneLevel(level: Level): Level {
  return {
    ...level,
    names: { ...level.names },
    pieces: level.pieces.map((piece) => ({
      ...piece,
      axes: [...piece.axes],
    })),
  };
}

function cloneBoardState(board: BoardState): BoardState {
  const positions: BoardState["positions"] = {};
  for (const [pieceId, position] of Object.entries(board.positions)) {
    positions[pieceId] = { x: position.x, y: position.y };
  }
  return { positions };
}

function cloneMoveCommand(move: MoveCommand): MoveCommand {
  return { ...move };
}

function isMoveCommand(value: unknown): value is MoveCommand {
  const move = asRecord(value);
  return Boolean(
    move &&
    typeof move.pieceId === "string" &&
    move.pieceId.length > 0 &&
    (move.direction === "up" ||
      move.direction === "down" ||
      move.direction === "left" ||
      move.direction === "right") &&
    Number.isSafeInteger(move.distance) &&
    (move.distance as number) > 0,
  );
}

function boardsMatch(left: BoardState, right: BoardState): boolean {
  const leftEntries = Object.entries(left.positions);
  if (leftEntries.length !== Object.keys(right.positions).length) {
    return false;
  }

  return leftEntries.every(([pieceId, position]) => {
    const otherPosition = right.positions[pieceId];
    return Boolean(
      otherPosition &&
        otherPosition.x === position.x &&
        otherPosition.y === position.y,
    );
  });
}

/** Validates that the board, undo stack, and recorded moves form one real game path. */
export function isValidGameSnapshot(
  value: unknown,
  canonicalLevel: Level,
): value is GameSnapshot {
  const snapshot = asRecord(value);
  if (
    !snapshot ||
    !isValidLevelDefinition(canonicalLevel) ||
    snapshot.levelId !== canonicalLevel.id ||
    !Number.isSafeInteger(snapshot.steps) ||
    (snapshot.steps as number) < 0 ||
    !Array.isArray(snapshot.moves) ||
    snapshot.moves.length !== snapshot.steps ||
    !Array.isArray(snapshot.undoStack) ||
    snapshot.undoStack.length !== snapshot.steps ||
    (snapshot.status !== "playing" && snapshot.status !== "won") ||
    !isValidBoardState(snapshot.board, canonicalLevel)
  ) {
    return false;
  }

  let board = createInitialBoardState(canonicalLevel);
  for (let index = 0; index < snapshot.moves.length; index += 1) {
    const previousBoard = snapshot.undoStack[index];
    const move = snapshot.moves[index];
    if (
      !isValidBoardState(previousBoard, canonicalLevel) ||
      !boardsMatch(previousBoard, board) ||
      !isMoveCommand(move) ||
      hasWon(board, canonicalLevel)
    ) {
      return false;
    }

    const nextBoard = applyMove(board, canonicalLevel, move);
    if (!nextBoard) {
      return false;
    }
    board = nextBoard;
  }

  return (
    boardsMatch(snapshot.board as BoardState, board) &&
    snapshot.status === (hasWon(board, canonicalLevel) ? "won" : "playing")
  );
}

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    board: cloneBoardState(snapshot.board),
    moves: snapshot.moves.map(cloneMoveCommand),
    undoStack: snapshot.undoStack.map(cloneBoardState),
  };
}

function createInitialSnapshot(level: Level): GameSnapshot {
  const board = createInitialBoardState(level);
  return {
    levelId: level.id,
    board,
    steps: 0,
    moves: [],
    undoStack: [],
    status: hasWon(board, level) ? "won" : "playing",
  };
}

function copyAndValidateLevel(level: Level): Level {
  if (!isValidLevelDefinition(level)) {
    throw new Error("Cannot start a game with an invalid level definition.");
  }
  return cloneLevel(level);
}

export class InMemoryGameStore implements GameStore {
  private level: Level;
  private snapshot: GameSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(initialLevel: Level) {
    this.level = copyAndValidateLevel(initialLevel);
    this.snapshot = createInitialSnapshot(this.level);
  }

  getSnapshot(): GameSnapshot {
    return cloneSnapshot(this.snapshot);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  move(command: MoveCommand): boolean {
    if (this.snapshot.status === "won") {
      return false;
    }

    const board = applyMove(this.snapshot.board, this.level, command);
    if (!board) {
      return false;
    }

    this.snapshot = {
      levelId: this.level.id,
      board,
      steps: this.snapshot.steps + 1,
      moves: [...this.snapshot.moves, cloneMoveCommand(command)],
      undoStack: [
        ...this.snapshot.undoStack,
        cloneBoardState(this.snapshot.board),
      ],
      status: hasWon(board, this.level) ? "won" : "playing",
    };
    this.notify();
    return true;
  }

  undo(): void {
    if (this.snapshot.status === "won") {
      return;
    }

    const previousBoard = this.snapshot.undoStack.at(-1);
    if (!previousBoard) {
      return;
    }

    const undoStack = this.snapshot.undoStack.slice(0, -1);
    this.snapshot = {
      levelId: this.level.id,
      board: cloneBoardState(previousBoard),
      steps: undoStack.length,
      moves: this.snapshot.moves.slice(0, -1).map(cloneMoveCommand),
      undoStack,
      status: hasWon(previousBoard, this.level) ? "won" : "playing",
    };
    this.notify();
  }

  restart(): void {
    if (this.snapshot.status === "won") {
      return;
    }
    this.snapshot = createInitialSnapshot(this.level);
    this.notify();
  }

  startLevel(level: Level): void {
    const nextLevel = copyAndValidateLevel(level);
    const nextSnapshot = createInitialSnapshot(nextLevel);
    this.level = nextLevel;
    this.snapshot = nextSnapshot;
    this.notify();
  }

  restore(snapshot: GameSnapshot, canonicalLevel: Level): boolean {
    if (!isValidGameSnapshot(snapshot, canonicalLevel)) {
      return false;
    }

    const level = cloneLevel(canonicalLevel);
    this.level = level;
    this.snapshot = cloneSnapshot(snapshot);
    this.notify();
    return true;
  }

  private notify(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}
