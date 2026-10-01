import type { Solution } from "./types";

export interface SolutionRepository {
  load(levelId: number): Promise<Solution | null>;
}
