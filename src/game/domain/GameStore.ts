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

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    board: cloneBoardState(snapshot.board),
    undoStack: snapshot.undoStack.map(cloneBoardState),
  };
}

function createInitialSnapshot(level: Level): GameSnapshot {
  const board = createInitialBoardState(level);
  return {
    levelId: level.id,
    board,
    steps: 0,
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
    const previousBoard = this.snapshot.undoStack.at(-1);
    if (!previousBoard) {
      return;
    }

    const undoStack = this.snapshot.undoStack.slice(0, -1);
    this.snapshot = {
      levelId: this.level.id,
      board: cloneBoardState(previousBoard),
      steps: undoStack.length,
      undoStack,
      status: hasWon(previousBoard, this.level) ? "won" : "playing",
    };
    this.notify();
  }

  restart(): void {
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
    const snapshotRecord = asRecord(snapshot);
    if (
      !snapshotRecord ||
      !isValidLevelDefinition(canonicalLevel) ||
      snapshotRecord.levelId !== canonicalLevel.id ||
      !Number.isSafeInteger(snapshotRecord.steps) ||
      (snapshotRecord.steps as number) < 0 ||
      !Array.isArray(snapshotRecord.undoStack) ||
      snapshotRecord.undoStack.length !== snapshotRecord.steps ||
      (snapshotRecord.status !== "playing" && snapshotRecord.status !== "won") ||
      !isValidBoardState(snapshotRecord.board, canonicalLevel) ||
      !snapshotRecord.undoStack.every((board) =>
        isValidBoardState(board, canonicalLevel),
      )
    ) {
      return false;
    }

    const level = cloneLevel(canonicalLevel);
    const board = snapshotRecord.board as BoardState;
    const expectedStatus = hasWon(board, level) ? "won" : "playing";
    if (snapshotRecord.status !== expectedStatus) {
      return false;
    }

    this.level = level;
    this.snapshot = {
      levelId: level.id,
      board: cloneBoardState(board),
      steps: snapshotRecord.steps as number,
      undoStack: snapshotRecord.undoStack.map((previous) =>
        cloneBoardState(previous as BoardState),
      ),
      status: expectedStatus,
    };
    this.notify();
    return true;
  }

  private notify(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}
