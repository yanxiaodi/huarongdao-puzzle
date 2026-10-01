import type { Level } from "../data/levelSchema";
import { InMemoryGameStore } from "../game/domain/GameStore";
import { hasWon } from "../game/domain/rules";
import type { GameStore, MoveCommand } from "../game/domain/types";
import {
  INITIAL_PLAYBACK_INTERVAL_MS,
  MIN_PLAYBACK_INTERVAL_MS,
  PLAYBACK_INTERVAL_ADJUSTMENT_MS,
} from "../game/domain/MovePlayback";
import type { SolutionAccessProvider } from "./SolutionAccessProvider";
import type { SolutionRepository } from "./SolutionRepository";
import type {
  PlaybackSnapshot,
  PlaybackStatus,
  SolutionPlaybackController,
} from "./types";

/** Plays a published solution against a private store, leaving the active game untouched. */
export class SolutionPlayback implements SolutionPlaybackController {
  private readonly gameStore: InMemoryGameStore;
  private readonly listeners = new Set<() => void>();
  private moves: MoveCommand[] = [];
  private currentStep = 0;
  private intervalMs = INITIAL_PLAYBACK_INTERVAL_MS;
  private status: PlaybackStatus = "paused";
  private message: string | undefined;
  private timer: number | null = null;
  private initialized = false;
  private initialization: Promise<PlaybackSnapshot> | null = null;
  private disposed = false;

  constructor(
    private readonly level: Level,
    private readonly repository: SolutionRepository,
    private readonly accessProvider: SolutionAccessProvider,
  ) {
    this.gameStore = new InMemoryGameStore(level);
  }

  getGameStore(): GameStore {
    return this.gameStore;
  }

  getSnapshot(): PlaybackSnapshot {
    const visibleBoard = this.status === "locked" || this.status === "unavailable"
      ? null
      : this.gameStore.getSnapshot().board.positions;
    const positions = visibleBoard
      ? Object.fromEntries(Object.entries(visibleBoard).map(([pieceId, position]) => [pieceId, { ...position }]))
      : null;

    return {
      status: this.status,
      positions,
      currentStep: this.currentStep,
      totalSteps: this.moves.length,
      intervalMs: this.intervalMs,
      ...(this.message ? { message: this.message } : {}),
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  initialize(): Promise<PlaybackSnapshot> {
    if (!this.initialization) {
      this.initialization = this.loadSolution();
    }
    return this.initialization;
  }

  play(): PlaybackSnapshot {
    if (!this.initialized || this.isUnavailable()) return this.getSnapshot();
    if (this.currentStep >= this.moves.length) {
      if (!this.reset()) return this.getSnapshot();
    }
    if (this.moves.length === 0) {
      if (hasWon(this.gameStore.getSnapshot().board, this.level)) {
        this.status = "completed";
        this.message = undefined;
      } else {
        this.markInvalid("solution-did-not-win");
      }
      this.notify();
      return this.getSnapshot();
    }

    this.status = "playing";
    this.startTimer();
    this.notify();
    return this.getSnapshot();
  }

  pause(): PlaybackSnapshot {
    this.stopTimer();
    if (this.status === "playing") this.status = "paused";
    this.notify();
    return this.getSnapshot();
  }

  stepForward(): PlaybackSnapshot {
    this.stopTimer();
    if (!this.initialized || this.isUnavailable() || this.status === "invalid" || this.currentStep >= this.moves.length) {
      return this.getSnapshot();
    }
    this.applyNextMove(false);
    return this.getSnapshot();
  }

  stepBack(): PlaybackSnapshot {
    this.stopTimer();
    if (!this.initialized || this.isUnavailable() || this.status === "invalid") {
      return this.getSnapshot();
    }
    if (this.currentStep === 0) {
      this.status = "paused";
      this.notify();
      return this.getSnapshot();
    }

    const previousStep = this.currentStep - 1;
    if (this.currentStep === this.moves.length) {
      if (!this.rebuildToStep(previousStep)) {
        this.notify();
        return this.getSnapshot();
      }
    } else {
      this.gameStore.undo();
      this.currentStep = previousStep;
    }
    this.status = "paused";
    this.message = undefined;
    this.notify();
    return this.getSnapshot();
  }

  faster(): PlaybackSnapshot {
    this.intervalMs = Math.max(
      MIN_PLAYBACK_INTERVAL_MS,
      this.intervalMs - PLAYBACK_INTERVAL_ADJUSTMENT_MS,
    );
    this.refreshTimer();
    this.notify();
    return this.getSnapshot();
  }

  slower(): PlaybackSnapshot {
    this.intervalMs += PLAYBACK_INTERVAL_ADJUSTMENT_MS;
    this.refreshTimer();
    this.notify();
    return this.getSnapshot();
  }

  exit(): PlaybackSnapshot {
    this.stopTimer();
    if (this.status === "playing") this.status = "paused";
    this.notify();
    return this.getSnapshot();
  }

  dispose(): void {
    this.disposed = true;
    this.stopTimer();
    this.listeners.clear();
  }

  private async loadSolution(): Promise<PlaybackSnapshot> {
    try {
      const access = await this.accessProvider.check(this.level.id);
      if (this.disposed) return this.getSnapshot();
      if (access === "locked") {
        this.status = "locked";
        this.message = "solution-locked";
        this.notify();
        return this.getSnapshot();
      }
      if (access !== "granted") {
        this.status = "unavailable";
        this.message = "access-unavailable";
        this.notify();
        return this.getSnapshot();
      }

      const solution = await this.repository.load(this.level.id);
      if (this.disposed) return this.getSnapshot();
      if (!solution || solution.levelId !== this.level.id) {
        this.status = "unavailable";
        this.message = "solution-missing";
        this.notify();
        return this.getSnapshot();
      }

      this.moves = solution.moves.map((move) => ({ ...move }));
      this.status = "paused";
      this.message = undefined;
      this.initialized = true;
      this.notify();
      return this.getSnapshot();
    } catch {
      if (!this.disposed) {
        this.status = "unavailable";
        this.message = "solution-unavailable";
        this.notify();
      }
      return this.getSnapshot();
    }
  }

  private applyNextMove(continuePlaying: boolean): void {
    const move = this.moves[this.currentStep];
    if (!move || !this.gameStore.move(move)) {
      this.stopTimer();
      this.markInvalid("invalid-move");
      this.notify();
      return;
    }

    this.currentStep += 1;
    const snapshot = this.gameStore.getSnapshot();
    if (snapshot.status === "won") {
      this.stopTimer();
      if (this.currentStep === this.moves.length) {
        this.status = "completed";
        this.message = undefined;
      } else {
        this.markInvalid("solution-continues-after-win");
      }
    } else if (this.currentStep >= this.moves.length) {
      this.stopTimer();
      this.markInvalid("solution-did-not-win");
    } else if (!continuePlaying) {
      this.status = "paused";
    }
    this.notify();
  }

  private reset(): boolean {
    this.stopTimer();
    if (!this.rebuildToStep(0)) return false;
    this.status = "paused";
    this.message = undefined;
    return true;
  }

  private rebuildToStep(step: number): boolean {
    const rebuilt = new InMemoryGameStore(this.level);
    for (let index = 0; index < step; index += 1) {
      const move = this.moves[index];
      if (!move || !rebuilt.move(move)) {
        this.markInvalid("invalid-move");
        return false;
      }
    }
    if (!this.gameStore.restore(rebuilt.getSnapshot(), this.level)) {
      this.markInvalid("invalid-move");
      return false;
    }
    this.currentStep = step;
    return true;
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = window.setInterval(() => this.applyNextMove(true), this.intervalMs);
  }

  private refreshTimer(): void {
    if (this.status === "playing") this.startTimer();
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private isUnavailable(): boolean {
    return this.status === "locked" || this.status === "unavailable";
  }

  private markInvalid(message: string): void {
    this.status = "invalid";
    this.message = message;
  }

  private notify(): void {
    if (this.disposed) return;
    for (const listener of [...this.listeners]) listener();
  }
}
