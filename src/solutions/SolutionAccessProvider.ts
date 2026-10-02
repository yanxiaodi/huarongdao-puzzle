import type { SolutionAccess } from "./types";

export interface SolutionAccessProvider {
  check(levelId: number): Promise<SolutionAccess>;
}
