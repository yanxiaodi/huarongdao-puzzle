import type { AppLocale } from "../i18n/types";
import { isAppLocale } from "../i18n/types";
import type { Level } from "../data/levelSchema";
import {
  applyMove,
  createInitialBoardState,
  hasWon,
} from "../game/domain/rules";
import { InMemoryGameStore, isValidGameSnapshot } from "../game/domain/GameStore";
import { rateMoves } from "../game/domain/scoring";
import type { GameSnapshot, MoveCommand } from "../game/domain/types";
import {
  cloneProgressSnapshot,
  createEmptyProgressSnapshot,
  type CompletionRecord,
  type ProgressSnapshot,
  type SavedGame,
  type StarRating,
  type UserSettings,
} from "./progress";

const STORAGE_KEY = "huarongdao.progress";
const COMPLETION_STORAGE_KEY = "huarongdao.completions";

export type ProgressStorageError = "unavailable" | "quota" | "write-failed";

export interface ProgressStore {
  load(levels: ReadonlyMap<number, Level>): ProgressSnapshot;
  getSnapshot(): ProgressSnapshot;
  getStorageError(): ProgressStorageError | null;
  subscribe(listener: (progressChanged: boolean) => void): () => void;
  getGame(levelId: number): GameSnapshot | null;
  getMostRecentUnfinishedLevelId(): number | null;
  openLevel(level: Level): OpenedGame;
  saveGame(snapshot: GameSnapshot, elapsedMs?: number): void;
  recordWin(snapshot: GameSnapshot, level: Level, elapsedMs?: number): RecordedCompletion;
  toggleFavorite(levelId: number): void;
  deleteCompletionRecord(recordId: string): void;
  updateSettings(settings: UserSettings): void;
}

export type OpenedGame = {
  snapshot: GameSnapshot;
  elapsedMs: number;
};

export type RecordedCompletion = {
  record: CompletionRecord;
  saved: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isStarRating(value: unknown): value is StarRating {
  return value === 1 || value === 2 || value === 3;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value));
}

function isElapsedTime(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isMoveCommand(value: unknown): value is MoveCommand {
  const move = asRecord(value);
  return Boolean(
    move &&
      typeof move.pieceId === "string" &&
      move.pieceId.length > 0 &&
      (move.direction === "up" ||
        move.direction === "down" ||
        move.direction === "left" ||
        move.direction === "right") &&
      Number.isSafeInteger(move.distance) &&
      (move.distance as number) > 0,
  );
}

function validateCompletionRecord(
  value: unknown,
  levels: ReadonlyMap<number, Level>,
): value is CompletionRecord {
  const record = asRecord(value);
  if (
    !record ||
    typeof record.id !== "string" ||
    record.id.length === 0 ||
    !Number.isSafeInteger(record.levelId) ||
    !Number.isSafeInteger(record.steps) ||
    (record.steps as number) <= 0 ||
    !Array.isArray(record.moves) ||
    record.moves.length !== record.steps ||
    !record.moves.every(isMoveCommand) ||
    !isStarRating(record.stars) ||
    !isTimestamp(record.completedAt) ||
    (record.elapsedMs !== undefined &&
      record.elapsedMs !== null &&
      !isElapsedTime(record.elapsedMs))
  ) {
    return false;
  }

  const level = levels.get(record.levelId as number);
  if (!level) return false;

  let board = createInitialBoardState(level);
  for (const move of record.moves) {
    if (hasWon(board, level)) return false;
    const nextBoard = applyMove(board, level, move);
    if (!nextBoard) return false;
    board = nextBoard;
  }

  return hasWon(board, level) &&
    record.stars === rateMoves(record.steps as number, level.minSteps);
}

function validateProgressSnapshot(
  value: unknown,
  levels: ReadonlyMap<number, Level>,
): value is ProgressSnapshot {
  const snapshot = asRecord(value);
  const settings = asRecord(snapshot?.settings);
  const gamesByLevel = asRecord(snapshot?.gamesByLevel);
  const bestStars = asRecord(snapshot?.bestStars);
  if (
    !snapshot ||
    snapshot.schemaVersion !== 1 ||
    !gamesByLevel ||
    !bestStars ||
    !Array.isArray(snapshot.favorites) ||
    !Array.isArray(snapshot.completionRecords) ||
    !settings ||
    typeof settings.soundEnabled !== "boolean" ||
    typeof settings.locale !== "string" ||
    !isAppLocale(settings.locale)
  ) {
    return false;
  }

  for (const [levelIdText, savedValue] of Object.entries(gamesByLevel)) {
    const levelId = Number(levelIdText);
    const saved = asRecord(savedValue);
    const level = levels.get(levelId);
    if (
      !Number.isSafeInteger(levelId) ||
      String(levelId) !== levelIdText ||
      !level ||
      !saved ||
      !isTimestamp(saved.openedAt) ||
      (saved.elapsedMs !== undefined && !isElapsedTime(saved.elapsedMs)) ||
      !isValidGameSnapshot(saved.snapshot, level) ||
      saved.snapshot.status !== "playing"
    ) {
      return false;
    }
  }

  for (const [levelIdText, stars] of Object.entries(bestStars)) {
    const levelId = Number(levelIdText);
    if (
      !Number.isSafeInteger(levelId) ||
      String(levelId) !== levelIdText ||
      !levels.has(levelId) ||
      !isStarRating(stars)
    ) {
      return false;
    }
  }

  const favorites = new Set<number>();
  for (const levelId of snapshot.favorites) {
    if (
      !Number.isSafeInteger(levelId) ||
      !levels.has(levelId as number) ||
      favorites.has(levelId as number)
    ) {
      return false;
    }
    favorites.add(levelId as number);
  }

  const recordIds = new Set<string>();
  for (const recordValue of snapshot.completionRecords) {
    if (
      !validateCompletionRecord(recordValue, levels) ||
      recordIds.has(recordValue.id)
    ) {
      return false;
    }
    recordIds.add(recordValue.id);
    const bestStarsForLevel = bestStars[String(recordValue.levelId)];
    if (!isStarRating(bestStarsForLevel) || bestStarsForLevel < recordValue.stars) {
      return false;
    }
  }

  return true;
}

function normalizeLegacyElapsedTimes(snapshot: ProgressSnapshot): ProgressSnapshot {
  return {
    ...snapshot,
    gamesByLevel: Object.fromEntries(
      Object.entries(snapshot.gamesByLevel).map(([levelId, saved]) => [
        levelId,
        { ...saved, elapsedMs: isElapsedTime(saved.elapsedMs) ? saved.elapsedMs : 0 },
      ]),
    ),
    completionRecords: snapshot.completionRecords.map((record) => ({
      ...record,
      elapsedMs: isElapsedTime(record.elapsedMs) ? record.elapsedMs : null,
    })),
  };
}

function cloneGameSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    board: {
      positions: Object.fromEntries(
        Object.entries(snapshot.board.positions).map(([pieceId, position]) => [pieceId, { ...position }]),
      ),
    },
    moves: snapshot.moves.map((move) => ({ ...move })),
    undoStack: snapshot.undoStack.map((board) => ({
      positions: Object.fromEntries(
        Object.entries(board.positions).map(([pieceId, position]) => [pieceId, { ...position}]),
      ),
    })),
  };
}

function getStorageError(error: unknown): ProgressStorageError {
  const name = asRecord(error)?.name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED"
    ? "quota"
    : "write-failed";
}

function createRecordId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class LocalProgressStore implements ProgressStore {
  private snapshot: ProgressSnapshot;
  private readonly listeners = new Set<(progressChanged: boolean) => void>();
  private levels: ReadonlyMap<number, Level> = new Map();
  private storageError: ProgressStorageError | null;
  private completionStorageReady = false;

  constructor(
    private readonly storage: Storage | null,
    private readonly initialLocale: AppLocale,
  ) {
    this.snapshot = createEmptyProgressSnapshot(initialLocale);
    this.storageError = storage ? null : "unavailable";
  }

  load(levels: ReadonlyMap<number, Level>): ProgressSnapshot {
    this.levels = levels;
    this.completionStorageReady = false;
    const fallback = createEmptyProgressSnapshot(this.initialLocale);
    if (!levels.has(1)) {
      throw new Error("The level catalogue is missing Level 1.");
    }

    if (!this.storage) {
      this.snapshot = fallback;
      return cloneProgressSnapshot(this.snapshot);
    }

    try {
      const serialized = this.storage.getItem(STORAGE_KEY);
      if (serialized === null) {
        this.snapshot = fallback;
        this.completionStorageReady = true;
      } else {
        const parsed: unknown = JSON.parse(serialized);
        const parsedSnapshot = asRecord(parsed);
        const serializedCompletions = this.storage.getItem(COMPLETION_STORAGE_KEY);
        const legacyRecords = Array.isArray(parsedSnapshot?.completionRecords)
          ? parsedSnapshot.completionRecords
          : [];
        const completionRecords: unknown[] = serializedCompletions === null
          ? [...legacyRecords]
          : JSON.parse(serializedCompletions);
        if (!Array.isArray(completionRecords)) throw new Error("Invalid completion history.");
        const completionIds = new Set(
          completionRecords.flatMap((record) => {
            const id = asRecord(record)?.id;
            return typeof id === "string" ? [id] : [];
          }),
        );
        let hasUnsyncedLegacyRecords = false;
        for (const record of legacyRecords) {
          const id = asRecord(record)?.id;
          if (typeof id !== "string" || completionIds.has(id)) continue;
          completionRecords.push(record);
          completionIds.add(id);
          hasUnsyncedLegacyRecords = true;
        }
        const combined = { ...parsedSnapshot, completionRecords };
        const valid = validateProgressSnapshot(combined, levels);
        this.snapshot = valid
          ? cloneProgressSnapshot(normalizeLegacyElapsedTimes(combined as ProgressSnapshot))
          : fallback;
        const hasHistoryToPersist = completionRecords.length > 0 && serializedCompletions === null;
        this.completionStorageReady = valid && !hasUnsyncedLegacyRecords && !hasHistoryToPersist;
        if (valid && !this.completionStorageReady) {
          this.completionStorageReady = this.persistCompletionRecordsOnly();
        }
      }
      if (this.completionStorageReady) this.storageError = null;
    } catch {
      this.snapshot = fallback;
      this.storageError = "unavailable";
    }
    return cloneProgressSnapshot(this.snapshot);
  }

  getSnapshot(): ProgressSnapshot {
    return cloneProgressSnapshot(this.snapshot);
  }

  getStorageError(): ProgressStorageError | null {
    return this.storageError;
  }

  subscribe(listener: (progressChanged: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getGame(levelId: number): GameSnapshot | null {
    const saved = this.snapshot.gamesByLevel[String(levelId)];
    return saved ? cloneGameSnapshot(saved.snapshot) : null;
  }

  getMostRecentUnfinishedLevelId(): number | null {
    const mostRecent = Object.entries(this.snapshot.gamesByLevel).sort(
      ([, left], [, right]) => Date.parse(right.openedAt) - Date.parse(left.openedAt),
    )[0];
    return mostRecent ? Number(mostRecent[0]) : null;
  }

  openLevel(level: Level): OpenedGame {
    const canonicalLevel = this.levels.get(level.id);
    if (!canonicalLevel) {
      throw new Error(`Level ${level.id} is not in the canonical catalogue.`);
    }

    const key = String(canonicalLevel.id);
    const previous = this.snapshot.gamesByLevel[key];
    const gameSnapshot = previous?.snapshot ?? new InMemoryGameStore(canonicalLevel).getSnapshot();
    const newestOpenedAt = Math.max(
      Date.now(),
      ...Object.values(this.snapshot.gamesByLevel).map((savedGame) => Date.parse(savedGame.openedAt) + 1),
    );
    this.update({
      ...this.snapshot,
      gamesByLevel: {
        ...this.snapshot.gamesByLevel,
        [key]: {
          snapshot: cloneGameSnapshot(gameSnapshot),
          openedAt: new Date(newestOpenedAt).toISOString(),
          elapsedMs: previous?.elapsedMs ?? 0,
        },
      },
    });
    return {
      snapshot: cloneGameSnapshot(gameSnapshot),
      elapsedMs: previous?.elapsedMs ?? 0,
    };
  }

  saveGame(snapshot: GameSnapshot, elapsedMs = 0): void {
    const level = this.levels.get(snapshot.levelId);
    if (!level || snapshot.levelId !== level.id || snapshot.status !== "playing") {
      return;
    }

    const key = String(snapshot.levelId);
    const existing = this.snapshot.gamesByLevel[key];
    this.snapshot = {
      ...this.snapshot,
      gamesByLevel: {
        ...this.snapshot.gamesByLevel,
        [key]: {
          snapshot: cloneGameSnapshot(snapshot),
          openedAt: existing?.openedAt ?? new Date().toISOString(),
          elapsedMs: isElapsedTime(elapsedMs) ? elapsedMs : existing?.elapsedMs ?? 0,
        },
      },
    };
    this.persist();
    this.notify(false);
  }

  recordWin(snapshot: GameSnapshot, level: Level, elapsedMs = 0): RecordedCompletion {
    const canonicalLevel = this.levels.get(level.id);
    if (
      snapshot.status !== "won" ||
      !canonicalLevel ||
      !isValidGameSnapshot(snapshot, canonicalLevel)
    ) {
      throw new Error("Cannot record an invalid or unfinished game.");
    }

    const stars = rateMoves(snapshot.steps, canonicalLevel.minSteps);
    const record: CompletionRecord = {
      id: createRecordId(),
      levelId: canonicalLevel.id,
      steps: snapshot.steps,
      moves: snapshot.moves.map((move) => ({ ...move })),
      stars,
      completedAt: new Date().toISOString(),
      elapsedMs: isElapsedTime(elapsedMs) ? elapsedMs : 0,
    };
    const key = String(canonicalLevel.id);
    const previousBest = this.snapshot.bestStars[key];
    const saved = this.update({
      ...this.snapshot,
      gamesByLevel: removeKey(this.snapshot.gamesByLevel, key),
      bestStars: {
        ...this.snapshot.bestStars,
        [key]: previousBest ? Math.max(previousBest, stars) as StarRating : stars,
      },
      completionRecords: [...this.snapshot.completionRecords, record],
    }, true);
    return {
      record: { ...record, moves: record.moves.map((move) => ({ ...move })) },
      saved,
    };
  }

  toggleFavorite(levelId: number): void {
    if (!this.levels.has(levelId)) return;
    const favorites = new Set(this.snapshot.favorites);
    if (favorites.has(levelId)) favorites.delete(levelId);
    else favorites.add(levelId);
    this.update({ ...this.snapshot, favorites: [...favorites].sort((a, b) => a - b) });
  }

  deleteCompletionRecord(recordId: string): void {
    this.update({
      ...this.snapshot,
      completionRecords: this.snapshot.completionRecords.filter((record) => record.id !== recordId),
    }, true);
  }

  updateSettings(settings: UserSettings): void {
    if (typeof settings.soundEnabled !== "boolean" || !isAppLocale(settings.locale)) return;
    this.update({ ...this.snapshot, settings: { ...settings } });
  }

  private update(snapshot: ProgressSnapshot, completionRecordsChanged = false): boolean {
    this.snapshot = cloneProgressSnapshot(snapshot);
    const saved = this.persist(completionRecordsChanged);
    this.notify();
    return saved;
  }

  private persist(completionRecordsChanged = false): boolean {
    if (!this.storage) {
      this.storageError = "unavailable";
      return false;
    }

    try {
      const progressWithoutHistory = { ...this.snapshot, completionRecords: [] };
      this.storage.setItem(STORAGE_KEY, JSON.stringify(progressWithoutHistory));
      if (completionRecordsChanged || !this.completionStorageReady) {
        this.storage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(this.snapshot.completionRecords));
        this.completionStorageReady = true;
      }
      this.storageError = null;
      return true;
    } catch (error) {
      this.completionStorageReady = false;
      this.storageError = getStorageError(error);
      return false;
    }
  }

  private persistCompletionRecordsOnly(): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(this.snapshot.completionRecords));
      return true;
    } catch (error) {
      this.storageError = getStorageError(error);
      return false;
    }
  }

  private notify(progressChanged = true): void {
    for (const listener of [...this.listeners]) listener(progressChanged);
  }
}

function removeKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

export function createBrowserProgressStore(locale: AppLocale): LocalProgressStore {
  try {
    return new LocalProgressStore(window.localStorage, locale);
  } catch {
    return new LocalProgressStore(null, locale);
  }
}
