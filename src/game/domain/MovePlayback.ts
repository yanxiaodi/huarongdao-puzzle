import type { Level } from "../../data/levelSchema";
import { InMemoryGameStore } from "./GameStore";
import type { GameStore, MoveCommand } from "./types";

export const INITIAL_PLAYBACK_INTERVAL_MS = 1500;
export const PLAYBACK_INTERVAL_ADJUSTMENT_MS = 200;
export const MIN_PLAYBACK_INTERVAL_MS = 200;

export type MovePlaybackStatus = "paused" | "playing" | "completed" | "invalid";

export type MovePlaybackSnapshot = {
  status: MovePlaybackStatus;
  currentStep: number;
  totalSteps: number;
  intervalMs: number;
};

/** Replays a command sequence against a private game store. */
export class MovePlayback {
  private readonly gameStore: InMemoryGameStore;
  private readonly moves: MoveCommand[];
  private readonly listeners = new Set<() => void>();
  private currentStep = 0;
  private intervalMs = INITIAL_PLAYBACK_INTERVAL_MS;
  private status: MovePlaybackStatus = "paused";
  private timer: number | null = null;

  constructor(level: Level, moves: readonly MoveCommand[]) {
    this.gameStore = new InMemoryGameStore(level);
    this.moves = moves.map((move) => ({ ...move }));
  }

  getGameStore(): GameStore {
    return this.gameStore;
  }

  getSnapshot(): MovePlaybackSnapshot {
    return {
      status: this.status,
      currentStep: this.currentStep,
      totalSteps: this.moves.length,
      intervalMs: this.intervalMs,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  play(): MovePlaybackSnapshot {
    if (this.status === "invalid") return this.getSnapshot();
    if (this.currentStep >= this.moves.length) {
      this.reset();
    }
    if (this.moves.length === 0) {
      this.status = "completed";
      this.notify();
      return this.getSnapshot();
    }

    this.status = "playing";
    this.startTimer();
    this.notify();
    return this.getSnapshot();
  }

  pause(): MovePlaybackSnapshot {
    this.stopTimer();
    if (this.status === "playing") this.status = "paused";
    this.notify();
    return this.getSnapshot();
  }

  stepForward(): MovePlaybackSnapshot {
    this.stopTimer();
    if (this.status === "invalid" || this.currentStep >= this.moves.length) {
      return this.getSnapshot();
    }
    this.applyNextMove(false);
    return this.getSnapshot();
  }

  stepBack(): MovePlaybackSnapshot {
    this.stopTimer();
    if (this.status === "invalid") {
      return this.getSnapshot();
    }
    if (this.currentStep === 0) {
      this.status = "paused";
      this.notify();
      return this.getSnapshot();
    }

    this.gameStore.undo();
    this.currentStep -= 1;
    this.status = "paused";
    this.notify();
    return this.getSnapshot();
  }

  faster(): MovePlaybackSnapshot {
    this.intervalMs = Math.max(
      MIN_PLAYBACK_INTERVAL_MS,
      this.intervalMs - PLAYBACK_INTERVAL_ADJUSTMENT_MS,
    );
    this.refreshTimer();
    this.notify();
    return this.getSnapshot();
  }

  slower(): MovePlaybackSnapshot {
    this.intervalMs += PLAYBACK_INTERVAL_ADJUSTMENT_MS;
    this.refreshTimer();
    this.notify();
    return this.getSnapshot();
  }

  reset(): MovePlaybackSnapshot {
    this.stopTimer();
    this.gameStore.restart();
    this.currentStep = 0;
    this.status = "paused";
    this.notify();
    return this.getSnapshot();
  }

  dispose(): void {
    this.stopTimer();
    this.listeners.clear();
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

  private applyNextMove(continuePlaying: boolean): void {
    const move = this.moves[this.currentStep];
    if (!move || !this.gameStore.move(move)) {
      this.stopTimer();
      this.status = "invalid";
      this.notify();
      return;
    }

    this.currentStep += 1;
    if (this.currentStep >= this.moves.length) {
      this.stopTimer();
      this.status = "completed";
    } else if (!continuePlaying) {
      this.status = "paused";
    }
    this.notify();
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
