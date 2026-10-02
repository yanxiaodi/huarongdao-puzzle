import type { SolutionAccessProvider } from "./SolutionAccessProvider";
import type { SolutionAccess } from "./types";

export class AlwaysAllowSolutionAccess implements SolutionAccessProvider {
  async check(_levelId: number): Promise<SolutionAccess> {
    return "granted";
  }
}
