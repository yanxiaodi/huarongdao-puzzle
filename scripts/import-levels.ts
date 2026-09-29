import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import OpenCC from "opencc-js";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { BOARD_HEIGHT, BOARD_WIDTH, LEVEL_SCHEMA_VERSION } from "../src/data/levelSchema.ts";
import type { Difficulty, Level, Piece } from "../src/data/levelSchema.ts";

const LEVEL_COUNT = 406;
const DIFFICULTY_COUNTS: Readonly<Record<Difficulty, number>> = {
  0: 15,
  1: 86,
  2: 70,
  3: 95,
  4: 72,
  5: 45,
  6: 23,
};
const PIECE_SHAPES: Readonly<Record<number, Pick<Piece, "width" | "height" | "axes">>> = {
  1: { width: 1, height: 1, axes: ["horizontal", "vertical"] },
  2: { width: 1, height: 2, axes: ["horizontal", "vertical"] },
  3: { width: 2, height: 1, axes: ["horizontal", "vertical"] },
  4: { width: 2, height: 2, axes: ["horizontal", "vertical"] },
};
const toSimplified = OpenCC.Converter({ from: "tw", to: "cn" });
const toTraditional = OpenCC.Converter({ from: "cn", to: "twp" });

type CliOptions = {
  input: string;
  output: string;
  mappingOutput?: string;
};

type LegacyRow = Record<string, unknown>;
type LegacyMappingEntry = {
  levelId: number;
  sourceId: number;
  sourceName: string;
};

type ImportResult = {
  levels: Level[];
  mapping: LegacyMappingEntry[];
  difficultyCounts: Record<Difficulty, number>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptions(args: string[]): CliOptions {
  const options: Partial<CliOptions> = {};
  const seen = new Set<string>();

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (key !== "--input" && key !== "--output" && key !== "--mapping-output") {
      throw new Error(`Unknown argument: ${key}`);
    }
    if (seen.has(key)) {
      throw new Error(`Argument ${key} may only be supplied once.`);
    }
    seen.add(key);

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Argument ${key} requires a path.`);
    }
    index += 1;

    if (key === "--input") options.input = value;
    if (key === "--output") options.output = value;
    if (key === "--mapping-output") options.mappingOutput = value;
  }

  if (!options.input || !options.output) {
    throw new Error(
      "Usage: npm run import:levels -- --input <AllLevels.xml> --output <levels.json> [--mapping-output <mapping.json>]",
    );
  }

  return options as CliOptions;
}

function parseInteger(
  row: LegacyRow,
  field: string,
  levelLabel: string,
  errors: string[],
): number | undefined {
  const value = row[field];
  if (typeof value !== "string" && typeof value !== "number") {
    errors.push(`Level ${levelLabel} ${field}: missing integer value.`);
    return undefined;
  }

  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) {
    errors.push(`Level ${levelLabel} ${field}: expected an integer, got ${JSON.stringify(text)}.`);
    return undefined;
  }

  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) {
    errors.push(`Level ${levelLabel} ${field}: integer is outside the safe range.`);
    return undefined;
  }

  return parsed;
}

function parseText(
  row: LegacyRow,
  field: string,
  levelLabel: string,
  errors: string[],
): string | undefined {
  const value = row[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`Level ${levelLabel} ${field}: missing non-empty text.`);
    return undefined;
  }
  return value.trim();
}

function parsePieceContent(
  row: LegacyRow,
  levelLabel: string,
  errors: string[],
): Piece[] {
  const value = row.Content;
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`Level ${levelLabel} Content: missing piece triples.`);
    return [];
  }

  const text = value.trim();
  if (!/^-?\d+(?:\s*,\s*-?\d+)*$/.test(text)) {
    errors.push(`Level ${levelLabel} Content: expected comma-separated integer triples (type,x,y).`);
    return [];
  }

  const values = text.split(",").map((part) => Number(part.trim()));
  if (values.length === 0 || values.length % 3 !== 0) {
    errors.push(`Level ${levelLabel} Content: expected a multiple of three values (type,x,y).`);
    return [];
  }

  const occurrences = new Map<number, number>();
  const pieces: Piece[] = [];

  for (let offset = 0; offset < values.length; offset += 3) {
    const pieceIndex = offset / 3 + 1;
    const type = values[offset];
    const x = values[offset + 1];
    const y = values[offset + 2];
    const shape = PIECE_SHAPES[type];

    if (!shape) {
      errors.push(`Level ${levelLabel} Content[${pieceIndex}].type: unknown piece type ${type}.`);
      continue;
    }

    const occurrence = (occurrences.get(type) ?? 0) + 1;
    occurrences.set(type, occurrence);
    const id = type === 4
      ? occurrence === 1 ? "cao-cao" : `cao-cao-${occurrence}`
      : `piece-${type}-${occurrence}`;

    pieces.push({ id, x, y, ...shape });
  }

  return pieces;
}

function validateLayout(levelLabel: string, pieces: Piece[], errors: string[]): void {
  const occupied = new Map<string, string>();
  const reportedOverlaps = new Set<string>();

  for (const piece of pieces) {
    const outOfBounds = piece.x < 0 || piece.y < 0 ||
      piece.x + piece.width > BOARD_WIDTH || piece.y + piece.height > BOARD_HEIGHT;
    if (outOfBounds) {
      errors.push(
        `Level ${levelLabel} Pieces.${piece.id}: (${piece.x},${piece.y}) ${piece.width}x${piece.height} is outside the ${BOARD_WIDTH}x${BOARD_HEIGHT} board.`,
      );
    }

    for (let y = piece.y; y < piece.y + piece.height; y += 1) {
      for (let x = piece.x; x < piece.x + piece.width; x += 1) {
        if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) continue;
        const cell = `${x},${y}`;
        const otherPieceId = occupied.get(cell);
        if (otherPieceId) {
          const pair = [piece.id, otherPieceId].sort().join("|");
          if (!reportedOverlaps.has(pair)) {
            reportedOverlaps.add(pair);
            errors.push(
              `Level ${levelLabel} Pieces.${piece.id}: overlaps ${otherPieceId} at cell (${cell}).`,
            );
          }
        } else {
          occupied.set(cell, piece.id);
        }
      }
    }
  }
}

function readEnglishTitles(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    throw new Error("scripts/level-titles.en.json must contain an object keyed by level ID.");
  }

  const titles: Record<string, string> = {};
  for (const [levelId, title] of Object.entries(value)) {
    if (!/^\d+$/.test(levelId) || typeof title !== "string" || title.trim().length === 0) {
      throw new Error(`scripts/level-titles.en.json entry ${levelId}: expected a non-empty English title.`);
    }
    titles[levelId] = title.trim();
  }

  const expectedKeys = new Set(Array.from({ length: LEVEL_COUNT }, (_, index) => String(index + 1)));
  for (const levelId of expectedKeys) {
    if (!titles[levelId]) {
      throw new Error(`scripts/level-titles.en.json entry ${levelId}: English title is missing.`);
    }
  }
  for (const levelId of Object.keys(titles)) {
    if (!expectedKeys.has(levelId)) {
      throw new Error(`scripts/level-titles.en.json entry ${levelId}: no matching runtime level exists.`);
    }
  }

  return titles;
}

function importLevels(xmlText: string, englishTitles: Record<string, string>): ImportResult {
  const errors: string[] = [];
  const validation = XMLValidator.validate(xmlText);
  if (validation !== true) {
    const { line, col, msg } = validation.err;
    throw new Error(`Invalid XML at ${line}:${col}: ${msg}`);
  }

  const parsedRoot = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  }).parse(xmlText) as { Levels?: { Level?: unknown } };
  const rawLevelNodes = parsedRoot.Levels?.Level;
  const rows = Array.isArray(rawLevelNodes)
    ? rawLevelNodes
    : rawLevelNodes === undefined ? [] : [rawLevelNodes];

  if (rows.length !== LEVEL_COUNT) {
    errors.push(`Levels: expected ${LEVEL_COUNT} entries, found ${rows.length}.`);
  }

  const levels: Level[] = [];
  const mapping: LegacyMappingEntry[] = [];
  const seenIds = new Set<number>();
  const seenSourceIds = new Set<number>();
  const difficultyCounts: Record<Difficulty, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  for (const [index, rawRow] of rows.entries()) {
    if (!isRecord(rawRow)) {
      errors.push(`Level row ${index + 1} Level: expected an object.`);
      continue;
    }
    const row: LegacyRow = rawRow;
    const rawId = row.LevelID;
    const levelLabel = typeof rawId === "string" || typeof rawId === "number"
      ? String(rawId).trim() || "unknown"
      : "unknown";
    const id = parseInteger(row, "LevelID", levelLabel, errors);
    const sourceId = parseInteger(row, "LevelInitialID", levelLabel, errors);
    const sourceName = parseText(row, "LevelName", levelLabel, errors);
    const difficultyValue = parseInteger(row, "Difficulty", levelLabel, errors);
    const minSteps = parseInteger(row, "MinSteps", levelLabel, errors);
    const pieces = parsePieceContent(row, levelLabel, errors);

    if (id !== undefined) {
      if (id < 1 || id > LEVEL_COUNT) {
        errors.push(`Level ${id} LevelID: expected a value from 1 to ${LEVEL_COUNT}.`);
      }
      if (seenIds.has(id)) {
        errors.push(`Level ${id} LevelID: duplicate level ID.`);
      }
      seenIds.add(id);
    }

    if (sourceId !== undefined) {
      if (sourceId <= 0) {
        errors.push(`Level ${levelLabel} LevelInitialID: expected a positive source ID.`);
      }
      if (seenSourceIds.has(sourceId)) {
        errors.push(`Level ${levelLabel} LevelInitialID: duplicate source ID ${sourceId}.`);
      }
      seenSourceIds.add(sourceId);
    }

    let difficulty: Difficulty | undefined;
    if (difficultyValue !== undefined) {
      if (difficultyValue < 0 || difficultyValue > 6) {
        errors.push(`Level ${levelLabel} Difficulty: expected a value from 0 to 6, got ${difficultyValue}.`);
      } else {
        difficulty = difficultyValue as Difficulty;
        difficultyCounts[difficulty] += 1;
      }
    }

    if (minSteps !== undefined && (!Number.isFinite(minSteps) || !Number.isInteger(minSteps) || minSteps <= 0)) {
      errors.push(`Level ${levelLabel} MinSteps: expected a finite positive integer, got ${minSteps}.`);
    }

    validateLayout(levelLabel, pieces, errors);

    const targetPieces = pieces.filter((piece) => piece.id === "cao-cao" || piece.id.startsWith("cao-cao-"));
    if (targetPieces.length !== 1) {
      errors.push(`Level ${levelLabel} Content: expected exactly one type-4 target piece, found ${targetPieces.length}.`);
    }
    const target = pieces.find((piece) => piece.id === "cao-cao");
    if (!target) {
      errors.push(`Level ${levelLabel} targetPieceId: cao-cao does not reference a piece.`);
    } else if (target.width !== 2 || target.height !== 2) {
      errors.push(`Level ${levelLabel} targetPieceId: cao-cao must be 2x2.`);
    }

    const duplicatePieceIds = pieces.map((piece) => piece.id).filter((pieceId, pieceIndex, all) => all.indexOf(pieceId) !== pieceIndex);
    for (const pieceId of new Set(duplicatePieceIds)) {
      errors.push(`Level ${levelLabel} Pieces.${pieceId}: duplicate piece ID.`);
    }

    const englishTitle = id === undefined ? undefined : englishTitles[String(id)];
    if (id !== undefined && !englishTitle) {
      errors.push(`Level ${levelLabel} names.en: no curated English title exists for this level ID.`);
    }

    if (
      id === undefined || sourceId === undefined || sourceName === undefined ||
      difficulty === undefined || minSteps === undefined || !englishTitle
    ) {
      continue;
    }

    const simplifiedName = toSimplified(sourceName);
    levels.push({
      id,
      targetPieceId: "cao-cao",
      names: {
        "zh-CN": simplifiedName,
        "zh-Hant": toTraditional(simplifiedName),
        en: englishTitle,
      },
      difficulty,
      minSteps,
      pieces,
    });
    mapping.push({ levelId: id, sourceId, sourceName });
  }

  for (const difficulty of Object.keys(DIFFICULTY_COUNTS).map(Number) as Difficulty[]) {
    const expected = DIFFICULTY_COUNTS[difficulty];
    const actual = difficultyCounts[difficulty];
    if (actual !== expected) {
      errors.push(`Levels.Difficulty ${difficulty}: expected ${expected} levels, found ${actual}.`);
    }
  }

  if (seenIds.size !== LEVEL_COUNT) {
    errors.push(`Levels.LevelID: expected ${LEVEL_COUNT} unique IDs from 1 to ${LEVEL_COUNT}, found ${seenIds.size}.`);
  }
  if (seenSourceIds.size !== LEVEL_COUNT) {
    errors.push(`Levels.LevelInitialID: expected ${LEVEL_COUNT} unique source IDs, found ${seenSourceIds.size}.`);
  }

  if (errors.length > 0) {
    throw new Error(`Level import failed with ${errors.length} issue(s):\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  levels.sort((left, right) => left.id - right.id);
  mapping.sort((left, right) => left.levelId - right.levelId);
  return { levels, mapping, difficultyCounts };
}

async function writeOutputs(outputs: Array<{ path: string; content: string }>): Promise<void> {
  const staged: Array<{ temporaryPath: string; outputPath: string }> = [];
  try {
    for (const output of outputs) {
      const outputPath = resolve(output.path);
      await mkdir(dirname(outputPath), { recursive: true });
      const temporaryPath = `${outputPath}.${process.pid}.tmp`;
      staged.push({ temporaryPath, outputPath });
      await writeFile(temporaryPath, output.content, { encoding: "utf8" });
    }
    for (const item of staged) {
      await rename(item.temporaryPath, item.outputPath);
    }
  } catch (error) {
    await Promise.all(staged.map(({ temporaryPath }) => rm(temporaryPath, { force: true })));
    throw error;
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const inputPath = resolve(options.input);
  const outputPath = resolve(options.output);
  const mappingPath = options.mappingOutput ? resolve(options.mappingOutput) : undefined;
  if (inputPath === outputPath || inputPath === mappingPath) {
    throw new Error("Input and output paths must be different.");
  }
  if (mappingPath && outputPath === mappingPath) {
    throw new Error("--output and --mapping-output must be different paths.");
  }

  const [xmlText, englishTitleText] = await Promise.all([
    readFile(inputPath, "utf8"),
    readFile(new URL("./level-titles.en.json", import.meta.url), "utf8"),
  ]);
  const englishTitles = readEnglishTitles(JSON.parse(englishTitleText) as unknown);
  const imported = importLevels(xmlText, englishTitles);

  const outputs = [{
    path: outputPath,
    content: `${JSON.stringify({ schemaVersion: LEVEL_SCHEMA_VERSION, levels: imported.levels }, null, 2)}\n`,
  }];
  if (mappingPath) {
    outputs.push({
      path: mappingPath,
      content: `${JSON.stringify({ schemaVersion: LEVEL_SCHEMA_VERSION, entries: imported.mapping }, null, 2)}\n`,
    });
  }
  await writeOutputs(outputs);

  const distribution = Object.entries(imported.difficultyCounts)
    .map(([difficulty, count]) => `${difficulty}:${count}`)
    .join(", ");
  console.log(`Imported ${imported.levels.length} levels to ${outputPath}.`);
  console.log(`Difficulty distribution: ${distribution}.`);
  if (mappingPath) console.log(`Wrote source mapping to ${mappingPath}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});