import { LEVEL_SCHEMA_VERSION, type Level } from "./levelSchema";
import { isValidLevelDefinition } from "../game/domain/rules";

const EXPECTED_LEVEL_COUNT = 406;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

let catalogPromise: Promise<readonly Level[]> | null = null;

export function loadLevelCatalog(): Promise<readonly Level[]> {
  if (!catalogPromise) {
    catalogPromise = fetch(`${import.meta.env.BASE_URL}data/levels.json`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Could not load the level catalogue (${response.status}).`);
        }

        const catalog = asRecord(await response.json() as unknown);
        if (
          !catalog ||
          catalog.schemaVersion !== LEVEL_SCHEMA_VERSION ||
          !Array.isArray(catalog.levels) ||
          catalog.levels.length !== EXPECTED_LEVEL_COUNT
        ) {
          throw new Error("The level catalogue has an unsupported format.");
        }

        const levelIds = new Set<number>();
        const levels: Level[] = [];
        for (const levelValue of catalog.levels) {
          if (
            !isValidLevelDefinition(levelValue) ||
            levelIds.has(levelValue.id)
          ) {
            throw new Error("The level catalogue contains an invalid or duplicate level.");
          }
          levelIds.add(levelValue.id);
          levels.push(levelValue);
        }

        return levels.sort((left, right) => left.id - right.id);
      })
      .catch((error: unknown) => {
        catalogPromise = null;
        throw error;
      });
  }

  return catalogPromise;
}

export async function loadLevelById(levelId: number): Promise<Level> {
  const levels = await loadLevelCatalog();
  const level = levels.find((candidate) => candidate.id === levelId);
  if (!level) {
    throw new Error(`Level ${levelId} is missing from the catalogue.`);
  }
  return level;
}
