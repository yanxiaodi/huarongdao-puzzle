import { LEVEL_SCHEMA_VERSION, type Level } from "./levelSchema";
import { isValidLevelDefinition } from "../game/domain/rules";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function loadLevelById(levelId: number): Promise<Level> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/levels.json`);
  if (!response.ok) {
    throw new Error(`Could not load the level catalogue (${response.status}).`);
  }

  const catalog = asRecord(await response.json() as unknown);
  if (
    !catalog ||
    catalog.schemaVersion !== LEVEL_SCHEMA_VERSION ||
    !Array.isArray(catalog.levels)
  ) {
    throw new Error("The level catalogue has an unsupported format.");
  }

  const levelValue = catalog.levels.find((value) => {
    const level = asRecord(value);
    return level?.id === levelId;
  });
  if (!isValidLevelDefinition(levelValue)) {
    throw new Error(`Level ${levelId} is missing or invalid.`);
  }

  return levelValue;
}
