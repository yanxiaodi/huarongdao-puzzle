import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  isPieceRoleId,
} from "../../data/levelSchema";
import type {
  Level,
  MovementAxis,
  Piece,
} from "../../data/levelSchema";
import type {
  BoardPosition,
  BoardState,
  Direction,
  MoveCommand,
} from "./types";

const DIRECTIONS: Record<
  Direction,
  { dx: number; dy: number; axis: MovementAxis }
> = {
  up: { dx: 0, dy: -1, axis: "vertical" },
  down: { dx: 0, dy: 1, axis: "vertical" },
  left: { dx: -1, dy: 0, axis: "horizontal" },
  right: { dx: 1, dy: 0, axis: "horizontal" },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isCellCoordinate(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

function isMovementAxis(value: unknown): value is MovementAxis {
  return value === "horizontal" || value === "vertical";
}

function hasValidPositions(
  positionsValue: unknown,
  level: Level,
): positionsValue is Record<string, BoardPosition> {
  const positions = asRecord(positionsValue);
  if (!positions || Object.keys(positions).length !== level.pieces.length) {
    return false;
  }

  const occupiedCells = new Set<string>();

  for (const piece of level.pieces) {
    if (!Object.hasOwn(positions, piece.id)) {
      return false;
    }

    const position = asRecord(positions[piece.id]);
    if (
      !position ||
      !isCellCoordinate(position.x) ||
      !isCellCoordinate(position.y)
    ) {
      return false;
    }

    const x = position.x;
    const y = position.y;
    if (
      x < 0 ||
      y < 0 ||
      x + piece.width > BOARD_WIDTH ||
      y + piece.height > BOARD_HEIGHT
    ) {
      return false;
    }

    for (let row = y; row < y + piece.height; row += 1) {
      for (let column = x; column < x + piece.width; column += 1) {
        const cell = column + "," + row;
        if (occupiedCells.has(cell)) {
          return false;
        }
        occupiedCells.add(cell);
      }
    }
  }

  return true;
}

export function isValidLevelDefinition(value: unknown): value is Level {
  const level = asRecord(value);
  if (
    !level ||
    !Number.isSafeInteger(level.id) ||
    (level.id as number) <= 0 ||
    typeof level.targetPieceId !== "string" ||
    level.targetPieceId.length === 0 ||
    !Number.isSafeInteger(level.difficulty) ||
    (level.difficulty as number) < 0 ||
    (level.difficulty as number) > 6 ||
    !Number.isSafeInteger(level.minSteps) ||
    (level.minSteps as number) <= 0
  ) {
    return false;
  }

  const names = asRecord(level.names);
  if (
    !names ||
    typeof names["zh-CN"] !== "string" ||
    typeof names["zh-Hant"] !== "string" ||
    typeof names.en !== "string" ||
    !Array.isArray(level.pieces) ||
    level.pieces.length === 0
  ) {
    return false;
  }

  const ids = new Set<string>();
  const pieces: Piece[] = [];

  for (const pieceValue of level.pieces) {
    const piece = asRecord(pieceValue);
    if (
      !piece ||
      typeof piece.id !== "string" ||
      piece.id.length === 0 ||
      !isPieceRoleId(piece.roleId) ||
      ids.has(piece.id) ||
      !isCellCoordinate(piece.x) ||
      !isCellCoordinate(piece.y) ||
      !Number.isSafeInteger(piece.width) ||
      (piece.width as number) <= 0 ||
      !Number.isSafeInteger(piece.height) ||
      (piece.height as number) <= 0 ||
      !Array.isArray(piece.axes) ||
      piece.axes.length === 0 ||
      !piece.axes.every(isMovementAxis) ||
      new Set(piece.axes).size !== piece.axes.length
    ) {
      return false;
    }

    ids.add(piece.id);
    pieces.push(piece as unknown as Piece);
  }

  const targetPiece = pieces.find(
    (piece) => piece.id === level.targetPieceId,
  );
  if (
    !targetPiece ||
    targetPiece.width !== 2 ||
    targetPiece.height !== 2
  ) {
    return false;
  }

  const typedLevel = value as Level;
  const initialPositions: BoardState["positions"] = {};
  for (const piece of pieces) {
    initialPositions[piece.id] = { x: piece.x, y: piece.y };
  }

  return hasValidPositions(initialPositions, typedLevel);
}

export function isValidBoardState(
  state: unknown,
  level: Level,
): state is BoardState {
  if (!isValidLevelDefinition(level)) {
    return false;
  }

  const board = asRecord(state);
  return Boolean(board && hasValidPositions(board.positions, level));
}

export function createInitialBoardState(level: Level): BoardState {
  if (!isValidLevelDefinition(level)) {
    throw new Error("Cannot create a board from an invalid level definition.");
  }

  const positions: BoardState["positions"] = {};
  for (const piece of level.pieces) {
    positions[piece.id] = { x: piece.x, y: piece.y };
  }
  return { positions };
}

function isPiecePlacementClear(
  piece: Piece,
  position: BoardPosition,
  positions: BoardState["positions"],
  level: Level,
): boolean {
  if (
    position.x < 0 ||
    position.y < 0 ||
    position.x + piece.width > BOARD_WIDTH ||
    position.y + piece.height > BOARD_HEIGHT
  ) {
    return false;
  }

  for (const otherPiece of level.pieces) {
    if (otherPiece.id === piece.id) {
      continue;
    }

    const otherPosition = positions[otherPiece.id];
    const overlaps =
      position.x < otherPosition.x + otherPiece.width &&
      position.x + piece.width > otherPosition.x &&
      position.y < otherPosition.y + otherPiece.height &&
      position.y + piece.height > otherPosition.y;
    if (overlaps) {
      return false;
    }
  }

  return true;
}

function isDirection(value: unknown): value is Direction {
  return value === "up" || value === "down" || value === "left" || value === "right";
}

export function applyMove(
  state: BoardState,
  level: Level,
  move: MoveCommand,
): BoardState | null {
  const moveRecord = asRecord(move);
  if (
    !moveRecord ||
    !Number.isSafeInteger(moveRecord.distance) ||
    (moveRecord.distance as number) <= 0
  ) {
    return null;
  }

  if (
    !isValidLevelDefinition(level) ||
    !isValidBoardState(state, level) ||
    typeof moveRecord.pieceId !== "string" ||
    !isDirection(moveRecord.direction)
  ) {
    return null;
  }

  const piece = level.pieces.find(
    (candidate) => candidate.id === moveRecord.pieceId,
  );
  const direction = DIRECTIONS[moveRecord.direction];
  if (!piece || !piece.axes.includes(direction.axis)) {
    return null;
  }

  const distance = moveRecord.distance as number;
  const maximumPossibleDistance =
    direction.axis === "horizontal" ? BOARD_WIDTH : BOARD_HEIGHT;
  if (distance > maximumPossibleDistance) {
    return null;
  }

  const start = state.positions[piece.id];
  let destination = start;

  for (let step = 1; step <= distance; step += 1) {
    destination = {
      x: start.x + direction.dx * step,
      y: start.y + direction.dy * step,
    };
    if (!isPiecePlacementClear(piece, destination, state.positions, level)) {
      return null;
    }
  }

  const positions: BoardState["positions"] = {};
  for (const [pieceId, position] of Object.entries(state.positions)) {
    positions[pieceId] = { x: position.x, y: position.y };
  }
  positions[piece.id] = destination;

  return { positions };
}

export function hasWon(state: BoardState, level: Level): boolean {
  if (!isValidBoardState(state, level)) {
    return false;
  }

  const targetPosition = state.positions[level.targetPieceId];
  return targetPosition.x === 1 && targetPosition.y === BOARD_HEIGHT - 2;
}
