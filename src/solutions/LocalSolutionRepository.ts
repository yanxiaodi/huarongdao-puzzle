import type { SolutionRepository } from "./SolutionRepository";
import { SOLUTION_SCHEMA_VERSION, type Solution } from "./types";

type Fetcher = (input: RequestInfo | URL) => Promise<Response>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isSolutionMove(value: unknown): boolean {
  const move = asRecord(value);
  return Boolean(
    move &&
    typeof move.pieceId === "string" &&
    move.pieceId.length > 0 &&
    (move.direction === "up" || move.direction === "down" || move.direction === "left" || move.direction === "right") &&
    Number.isSafeInteger(move.distance) &&
    (move.distance as number) > 0,
  );
}

function isSolution(value: unknown): value is Solution {
  const solution = asRecord(value);
  return Boolean(
    solution &&
    Number.isSafeInteger(solution.levelId) &&
    (solution.levelId as number) > 0 &&
    Array.isArray(solution.moves) &&
    solution.moves.every(isSolutionMove),
  );
}

export class LocalSolutionRepository implements SolutionRepository {
  private catalogPromise: Promise<Map<number, Solution>> | null = null;

  constructor(private readonly fetcher: Fetcher = fetch.bind(globalThis)) {}

  async load(levelId: number): Promise<Solution | null> {
    if (!Number.isSafeInteger(levelId) || levelId <= 0) return null;

    if (!this.catalogPromise) {
      this.catalogPromise = this.loadCatalog().catch((error: unknown) => {
        this.catalogPromise = null;
        throw error;
      });
    }

    const catalog = await this.catalogPromise;
    const solution = catalog.get(levelId);
    return solution
      ? { levelId: solution.levelId, moves: solution.moves.map((move) => ({ ...move })) }
      : null;
  }

  private async loadCatalog(): Promise<Map<number, Solution>> {
    const response = await this.fetcher(`${import.meta.env.BASE_URL}data/solutions.json`);
    if (!response.ok) {
      throw new Error(`Could not load the solution catalogue (${response.status}).`);
    }

    const catalog = asRecord(await response.json() as unknown);
    if (
      !catalog ||
      catalog.schemaVersion !== SOLUTION_SCHEMA_VERSION ||
      !Array.isArray(catalog.solutions)
    ) {
      throw new Error("The solution catalogue has an unsupported format.");
    }

    const solutions = new Map<number, Solution>();
    for (const solutionValue of catalog.solutions) {
      if (!isSolution(solutionValue) || solutions.has(solutionValue.levelId)) {
        throw new Error("The solution catalogue contains an invalid or duplicate solution.");
      }
      solutions.set(solutionValue.levelId, {
        levelId: solutionValue.levelId,
        moves: solutionValue.moves.map((move) => ({ ...move })),
      });
    }
    return solutions;
  }
}
