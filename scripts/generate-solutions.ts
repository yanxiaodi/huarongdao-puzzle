import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  LEVEL_SCHEMA_VERSION,
  type Level,
  type MovementAxis,
} from "../src/data/levelSchema.ts";
import {
  applyMove,
  createMoveApplier,
  hasWon,
  isValidLevelDefinition,
} from "../src/game/domain/rules.ts";
import type { BoardState, Direction, MoveCommand } from "../src/game/domain/types.ts";
import { SOLUTION_SCHEMA_VERSION, type Solution } from "../src/solutions/types.ts";

const EXPECTED_LEVEL_COUNT = 406;
const HEURISTIC_WEIGHT = 2;
const DIRECTION_ORDER: readonly {
  direction: Direction;
  axis: MovementAxis;
  dx: number;
  dy: number;
}[] = [
  { direction: "up", axis: "vertical", dx: 0, dy: -1 },
  { direction: "down", axis: "vertical", dx: 0, dy: 1 },
  { direction: "left", axis: "horizontal", dx: -1, dy: 0 },
  { direction: "right", axis: "horizontal", dx: 1, dy: 0 },
];

type SearchNode = {
  positions: Uint8Array;
  key: string;
  parent: number;
  move: MoveCommand | null;
  depth: number;
  heuristic: number;
  priority: number;
};

type SymmetryGroups = number[][];

class NodeHeap {
  private readonly indexes: number[] = [];
  private readonly nodes: readonly SearchNode[];

  constructor(nodes: readonly SearchNode[]) {
    this.nodes = nodes;
  }

  get size(): number {
    return this.indexes.length;
  }

  push(index: number): void {
    this.indexes.push(index);
    let child = this.indexes.length - 1;
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (!this.less(this.indexes[child], this.indexes[parent])) break;
      [this.indexes[child], this.indexes[parent]] = [this.indexes[parent], this.indexes[child]];
      child = parent;
    }
  }

  pop(): number | undefined {
    if (this.indexes.length === 0) return undefined;
    const first = this.indexes[0];
    const last = this.indexes.pop();
    if (this.indexes.length > 0 && last !== undefined) {
      this.indexes[0] = last;
      let parent = 0;
      while (true) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (left < this.indexes.length && this.less(this.indexes[left], this.indexes[smallest])) {
          smallest = left;
        }
        if (right < this.indexes.length && this.less(this.indexes[right], this.indexes[smallest])) {
          smallest = right;
        }
        if (smallest === parent) break;
        [this.indexes[parent], this.indexes[smallest]] = [this.indexes[smallest], this.indexes[parent]];
        parent = smallest;
      }
    }
    return first;
  }

  private less(leftIndex: number, rightIndex: number): boolean {
    const left = this.nodes[leftIndex];
    const right = this.nodes[rightIndex];
    return left.priority < right.priority ||
      (left.priority === right.priority && left.heuristic < right.heuristic) ||
      (left.priority === right.priority && left.heuristic === right.heuristic && leftIndex < rightIndex);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getSymmetryGroups(level: Level): SymmetryGroups {
  const groupsByShape = new Map<string, number[]>();
  level.pieces.forEach((piece, index) => {
    const axes = [...piece.axes].sort().join(",");
    const target = piece.id === level.targetPieceId ? "target" : "piece";
    const key = `${target}:${piece.width}x${piece.height}:${axes}`;
    const group = groupsByShape.get(key);
    if (group) group.push(index);
    else groupsByShape.set(key, [index]);
  });
  return [...groupsByShape.values()];
}

function encodeState(positions: Uint8Array, groups: SymmetryGroups): string {
  const anchors: number[] = [];
  for (const group of groups) {
    const groupAnchors = group.map((index) => positions[index]).sort((left, right) => left - right);
    anchors.push(...groupAnchors);
  }
  return String.fromCharCode(...anchors);
}

function toBoardState(level: Level, positions: Uint8Array): BoardState {
  const boardPositions: BoardState["positions"] = {};
  level.pieces.forEach((piece, index) => {
    const anchor = positions[index];
    boardPositions[piece.id] = {
      x: anchor % BOARD_WIDTH,
      y: Math.floor(anchor / BOARD_WIDTH),
    };
  });
  return { positions: boardPositions };
}

function overlaps(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): boolean {
  return left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y;
}

function blockersForDirectRoute(
  level: Level,
  positions: Uint8Array,
  horizontalFirst: boolean,
): number {
  const targetIndex = level.pieces.findIndex((piece) => piece.id === level.targetPieceId);
  const targetPiece = level.pieces[targetIndex];
  const targetAnchor = positions[targetIndex];
  let targetX = targetAnchor % BOARD_WIDTH;
  let targetY = Math.floor(targetAnchor / BOARD_WIDTH);
  const blockedPieceIndexes = new Set<number>();
  const axes: readonly MovementAxis[] = horizontalFirst
    ? ["horizontal", "vertical"]
    : ["vertical", "horizontal"];

  for (const axis of axes) {
    const destination = axis === "horizontal" ? 1 : BOARD_HEIGHT - 2;
    const current = axis === "horizontal" ? targetX : targetY;
    const delta = Math.sign(destination - current);
    for (let coordinate = current + delta; delta !== 0 && (delta > 0 ? coordinate <= destination : coordinate >= destination); coordinate += delta) {
      const targetAtStep = {
        x: axis === "horizontal" ? coordinate : targetX,
        y: axis === "vertical" ? coordinate : targetY,
        width: targetPiece.width,
        height: targetPiece.height,
      };
      level.pieces.forEach((piece, index) => {
        if (index === targetIndex) return;
        const anchor = positions[index];
        if (overlaps(targetAtStep, {
          x: anchor % BOARD_WIDTH,
          y: Math.floor(anchor / BOARD_WIDTH),
          width: piece.width,
          height: piece.height,
        })) {
          blockedPieceIndexes.add(index);
        }
      });
    }
    if (axis === "horizontal") targetX = destination;
    else targetY = destination;
  }

  return blockedPieceIndexes.size;
}

function estimateRemainingMoves(level: Level, positions: Uint8Array): number {
  const targetIndex = level.pieces.findIndex((piece) => piece.id === level.targetPieceId);
  const targetAnchor = positions[targetIndex];
  const targetX = targetAnchor % BOARD_WIDTH;
  const targetY = Math.floor(targetAnchor / BOARD_WIDTH);
  const requiredAxisMoves = Number(targetX !== 1) + Number(targetY !== BOARD_HEIGHT - 2);
  if (requiredAxisMoves === 0) return 0;

  const horizontalThenVertical = blockersForDirectRoute(level, positions, true);
  const verticalThenHorizontal = blockersForDirectRoute(level, positions, false);
  return requiredAxisMoves + Math.min(horizontalThenVertical, verticalThenHorizontal);
}

function reconstructPath(nodes: readonly SearchNode[], goalIndex: number): MoveCommand[] {
  const moves: MoveCommand[] = [];
  let nodeIndex = goalIndex;
  while (nodes[nodeIndex].parent >= 0) {
    const move = nodes[nodeIndex].move;
    if (!move) throw new Error("Search path contains a missing move command.");
    moves.push({ ...move });
    nodeIndex = nodes[nodeIndex].parent;
  }
  return moves.reverse();
}

function solveLevel(level: Level): { solution: Solution; expandedStates: number } {
  const initialPositions = Uint8Array.from(level.pieces, (piece) => piece.y * BOARD_WIDTH + piece.x);
  const groups = getSymmetryGroups(level);
  const targetIndex = level.pieces.findIndex((piece) => piece.id === level.targetPieceId);
  const applySearchMove = createMoveApplier(level);
  if (initialPositions[targetIndex] === (BOARD_HEIGHT - 2) * BOARD_WIDTH + 1) {
    return { solution: { levelId: level.id, moves: [] }, expandedStates: 0 };
  }

  const initialKey = encodeState(initialPositions, groups);
  const initialHeuristic = estimateRemainingMoves(level, initialPositions);
  const nodes: SearchNode[] = [{
    positions: initialPositions,
    key: initialKey,
    parent: -1,
    move: null,
    depth: 0,
    heuristic: initialHeuristic,
    priority: initialHeuristic * HEURISTIC_WEIGHT,
  }];
  const heap = new NodeHeap(nodes);
  heap.push(0);
  const bestNodeByState = new Map<string, number>([[initialKey, 0]]);
  let expandedStates = 0;

  while (heap.size > 0) {
    const nodeIndex = heap.pop();
    if (nodeIndex === undefined) break;
    const node = nodes[nodeIndex];
    if (bestNodeByState.get(node.key) !== nodeIndex) continue;
    expandedStates += 1;

    const board = toBoardState(level, node.positions);
    if (node.positions[targetIndex] === (BOARD_HEIGHT - 2) * BOARD_WIDTH + 1) {
      return {
        solution: { levelId: level.id, moves: reconstructPath(nodes, nodeIndex) },
        expandedStates,
      };
    }

    for (let pieceIndex = 0; pieceIndex < level.pieces.length; pieceIndex += 1) {
      const piece = level.pieces[pieceIndex];
      for (const direction of DIRECTION_ORDER) {
        if (!piece.axes.includes(direction.axis)) continue;
        const maxDistance = direction.axis === "horizontal" ? BOARD_WIDTH : BOARD_HEIGHT;
        for (let distance = 1; distance <= maxDistance; distance += 1) {
          const move: MoveCommand = { pieceId: piece.id, direction: direction.direction, distance };
          const nextBoard = applySearchMove(board, move);
          if (!nextBoard) break;

          const nextPosition = nextBoard.positions[piece.id];
          const nextPositions = node.positions.slice();
          nextPositions[pieceIndex] = nextPosition.y * BOARD_WIDTH + nextPosition.x;
          const key = encodeState(nextPositions, groups);
          const nextDepth = node.depth + 1;
          const previousNode = bestNodeByState.get(key);
          if (previousNode !== undefined && nodes[previousNode].depth <= nextDepth) continue;

          const heuristic = estimateRemainingMoves(level, nextPositions);
          const childIndex = nodes.length;
          nodes.push({
            positions: nextPositions,
            key,
            parent: nodeIndex,
            move,
            depth: nextDepth,
            heuristic,
            priority: nextDepth + heuristic * HEURISTIC_WEIGHT,
          });
          bestNodeByState.set(key, childIndex);
          heap.push(childIndex);
        }
      }
    }
  }

  throw new Error(`Level ${level.id}: no solution exists after exploring ${expandedStates} states.`);
}

function readFlag(args: readonly string[], name: string): string | null {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1] ?? null;
}

async function loadLevels(inputPath: string): Promise<Level[]> {
  const parsed = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  const catalog = asRecord(parsed);
  if (
    !catalog ||
    catalog.schemaVersion !== LEVEL_SCHEMA_VERSION ||
    !Array.isArray(catalog.levels) ||
    catalog.levels.length !== EXPECTED_LEVEL_COUNT
  ) {
    throw new Error(`Input level catalogue must contain ${EXPECTED_LEVEL_COUNT} levels at schema ${LEVEL_SCHEMA_VERSION}.`);
  }

  const ids = new Set<number>();
  const levels: Level[] = [];
  for (const value of catalog.levels) {
    if (!isValidLevelDefinition(value) || ids.has(value.id)) {
      const record = asRecord(value);
      throw new Error(`Level ${String(record?.id ?? "unknown")}: invalid or duplicate level definition.`);
    }
    ids.add(value.id);
    levels.push(value);
  }
  return levels.sort((left, right) => left.id - right.id);
}

async function writeCatalog(outputPath: string, solutions: readonly Solution[]): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  const catalog = {
    schemaVersion: SOLUTION_SCHEMA_VERSION,
    solutions,
  };

  try {
    await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputValue = readFlag(args, "--input");
  const outputValue = readFlag(args, "--output");
  if (!inputValue || !outputValue || args.some((arg, index) => arg.startsWith("--") && (arg !== "--input" && arg !== "--output" || !args[index + 1]))) {
    throw new Error("Usage: generate-solutions.ts --input <levels.json> --output <solutions.json>");
  }

  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(scriptDirectory, "..");
  const inputPath = resolve(projectRoot, inputValue);
  const outputPath = resolve(projectRoot, outputValue);
  const levels = await loadLevels(inputPath);
  const solutions: Solution[] = [];

  for (const [index, level] of levels.entries()) {
    try {
      const result = solveLevel(level);
      let state = toBoardState(level, Uint8Array.from(level.pieces, (piece) => piece.y * BOARD_WIDTH + piece.x));
      for (const move of result.solution.moves) {
        const nextState = applyMove(state, level, move);
        if (!nextState) throw new Error(`generated illegal move ${JSON.stringify(move)}`);
        state = nextState;
      }
      if (!hasWon(state, level)) throw new Error("generated sequence does not reach a winning board");
      solutions.push(result.solution);
      console.error(`Level ${level.id}: ${result.solution.moves.length} moves; ${result.expandedStates} states (${index + 1}/${levels.length}).`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Solution generation failed for level ${level.id}: ${reason}`, { cause: error });
    }
  }

  if (solutions.length !== EXPECTED_LEVEL_COUNT) {
    throw new Error(`Generated ${solutions.length} solutions; expected ${EXPECTED_LEVEL_COUNT}.`);
  }
  await writeCatalog(outputPath, solutions);
  console.error(`Wrote ${solutions.length} validated solutions to ${outputPath}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
