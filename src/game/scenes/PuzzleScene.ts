import Phaser from "phaser";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type Level,
  type MovementAxis,
  type PieceRoleId,
} from "../../data/levelSchema";
import { applyMove } from "../domain/rules";
import type {
  Direction,
  GameSnapshot,
  GameStore,
} from "../domain/types";
import { PieceView } from "../render/PieceView";
import {
  getPieceArtworkId,
  getPieceArtworkTextureKey,
  getPieceArtworkUrl,
  type ImagePieceTheme,
  type PieceTheme,
} from "../../appearance/pieceTheme";

const FRAME_SIZE = 13;
const MAX_CELL_SIZE = 102;
const MOVE_DURATION = 190;
const INPUT_THRESHOLD = 10;
const SNAP_ASSIST_RATIO = 0.3;
const WIN_PARTICLE_TEXTURE_KEY = "hrd-win-confetti";

const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

type PuzzleSceneOptions = {
  level: Level;
  store: GameStore;
  pieceLabels: Record<PieceRoleId, string>;
  pieceTheme: PieceTheme;
  readOnly?: boolean;
  onVictoryCelebrationComplete?: () => void;
};

type BoardLayout = {
  gridX: number;
  gridY: number;
  cellSize: number;
};

type DragState = {
  view: PieceView;
  pointerId: number;
  pointerStartX: number;
  pointerStartY: number;
  viewStartX: number;
  viewStartY: number;
  moved: boolean;
  axis: MovementAxis | null;
  maximumDistances: Record<Direction, number>;
};

export class PuzzleScene extends Phaser.Scene {
  private readonly options: PuzzleSceneOptions;
  private pieceLabels: Record<PieceRoleId, string>;
  private pieceTheme: PieceTheme;
  private readonly pendingThemeLoads = new Set<ImagePieceTheme>();
  private themeLoadListenerAttached = false;
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private readonly pieceViews = new Map<string, PieceView>();
  private layout: BoardLayout | null = null;
  private snapshot: GameSnapshot | null = null;
  private drag: DragState | null = null;
  private selectedPieceId: string | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private interactionLocked = false;
  private winAnimationPlayed = false;
  private victoryCelebrationCompleted = false;
  private victoryFinishTimer: Phaser.Time.TimerEvent | null = null;
  private victoryParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private hasLaidOut = false;
  private readonly handleVictorySkip = (): void => {
    this.completeVictoryCelebration(true);
  };

  constructor(options: PuzzleSceneOptions) {
    super("PuzzleScene");
    this.options = options;
    this.pieceLabels = options.pieceLabels;
    this.pieceTheme = options.pieceTheme;
  }

  preload(): void {
    if (this.pieceTheme !== "text") this.queuePieceArtwork(this.pieceTheme);
  }

  create(): void {
    if (this.pieceTheme !== "text" && !this.hasPieceArtwork(this.pieceTheme)) {
      console.warn(`Piece artwork for theme "${this.pieceTheme}" did not load; using text pieces for this game.`);
      this.pieceTheme = "text";
    }

    this.createWinParticleTexture();
    this.boardGraphics = this.add.graphics();

    for (const piece of this.options.level.pieces) {
      const view = new PieceView(
        this,
        piece,
        this.pieceLabels[piece.roleId],
        this.pieceTheme,
      );
      this.pieceViews.set(piece.id, view);
      if (this.options.readOnly) {
        view.container.disableInteractive();
      } else {
        view.container.on(
          Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
          (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer, view),
        );
      }
    }

    this.snapshot = this.options.store.getSnapshot();
    this.unsubscribeStore = this.options.store.subscribe(this.handleStoreChange);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.redrawBoard, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.finishPointer, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.finishPointer, this);
    this.game.canvas.addEventListener("pointerdown", this.capturePointer);
    this.game.canvas.addEventListener("pointercancel", this.handlePointerCancel);
    this.game.canvas.addEventListener("touchcancel", this.handlePointerCancel);
    this.redrawBoard();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this,
    );
  }

  setPieceLabels(pieceLabels: Record<PieceRoleId, string>): void {
    this.pieceLabels = pieceLabels;
    for (const view of this.pieceViews.values()) {
      view.setLabel(pieceLabels[view.piece.roleId]);
    }
  }

  setPieceTheme(pieceTheme: PieceTheme): void {
    if (pieceTheme === this.pieceTheme) return;
    this.pieceTheme = pieceTheme;

    if (pieceTheme === "text") {
      this.applyPieceTheme(pieceTheme);
      return;
    }

    if (this.hasPieceArtwork(pieceTheme)) {
      this.applyPieceTheme(pieceTheme);
      return;
    }

    this.pendingThemeLoads.add(pieceTheme);
    this.queuePieceArtwork(pieceTheme);
    if (!this.themeLoadListenerAttached) {
      this.themeLoadListenerAttached = true;
      this.load.once(Phaser.Loader.Events.COMPLETE, this.finishThemeLoad);
    }
    this.load.start();
  }

  private queuePieceArtwork(theme: ImagePieceTheme): void {
    const artworkIds = new Set(this.options.level.pieces.map(getPieceArtworkId));
    for (const artworkId of artworkIds) {
      const textureKey = getPieceArtworkTextureKey(theme, artworkId);
      if (this.textures.exists(textureKey)) continue;
      this.load.image(textureKey, getPieceArtworkUrl(theme, artworkId));
    }
  }

  private hasPieceArtwork(theme: ImagePieceTheme): boolean {
    const artworkIds = new Set(this.options.level.pieces.map(getPieceArtworkId));
    return [...artworkIds].every((artworkId) =>
      this.textures.exists(getPieceArtworkTextureKey(theme, artworkId)),
    );
  }

  private applyPieceTheme(pieceTheme: PieceTheme): void {
    for (const view of this.pieceViews.values()) {
      view.setPieceTheme(pieceTheme);
    }
  }

  private finishThemeLoad = (): void => {
    this.themeLoadListenerAttached = false;
    const loadedThemes = [...this.pendingThemeLoads];
    this.pendingThemeLoads.clear();

    for (const theme of loadedThemes) {
      if (!this.hasPieceArtwork(theme)) {
        console.warn(`Piece artwork for theme "${theme}" failed to load; keeping the current piece appearance.`);
        continue;
      }
      if (this.pieceTheme === theme) this.applyPieceTheme(theme);
    }
  };

  private beginDrag(pointer: Phaser.Input.Pointer, view: PieceView): void {
    if (
      !this.snapshot ||
      this.snapshot.status === "won" ||
      this.options.readOnly ||
      this.drag !== null ||
      !this.layout
    ) {
      return;
    }

    if (this.interactionLocked) {
      // Finish the short snap tween so an immediate next drag is not discarded.
      this.renderSnapshot(this.snapshot, false);
    }

    const maximumDistances = this.maximumLegalDistances(view.piece.id);
    this.clearSelection();
    this.selectedPieceId = view.piece.id;
    this.children.bringToTop(view.container);
    this.drag = {
      view,
      pointerId: pointer.id,
      pointerStartX: pointer.worldX,
      pointerStartY: pointer.worldY,
      viewStartX: view.container.x,
      viewStartY: view.container.y,
      moved: false,
      axis: null,
      maximumDistances,
    };
    view.setSelection(
      true,
      new Set(DIRECTIONS.filter((direction) => maximumDistances[direction] > 0)),
    );
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    const layout = this.layout;
    if (!drag || !layout || drag.pointerId !== pointer.id || !pointer.isDown) return;

    const deltaX = pointer.worldX - drag.pointerStartX;
    const deltaY = pointer.worldY - drag.pointerStartY;
    if (!drag.moved) {
      if (Math.hypot(deltaX, deltaY) < INPUT_THRESHOLD) return;
      drag.moved = true;
    }
    // Keep the first dominant direction for this gesture; diagonal corrections
    // should not change which move is committed when the pointer is released.
    drag.axis ??= this.axisWithLegalMove(drag, deltaX, deltaY);
    if (!drag.axis) return;

    const delta = drag.axis === "horizontal" ? deltaX : deltaY;
    const direction = drag.axis === "horizontal"
      ? delta < 0 ? "left" : "right"
      : delta < 0 ? "up" : "down";
    const maximumPixels = drag.maximumDistances[direction] * layout.cellSize;
    const constrainedDelta = Math.sign(delta) * Math.min(Math.abs(delta), maximumPixels);
    drag.view.setCenterPosition(
      drag.viewStartX + (drag.axis === "horizontal" ? constrainedDelta : 0),
      drag.viewStartY + (drag.axis === "vertical" ? constrainedDelta : 0),
    );
  }

  private finishPointer(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== pointer.id) return;
    this.drag = null;

    if (!this.layout) return;

    const deltaX = pointer.worldX - drag.pointerStartX;
    const deltaY = pointer.worldY - drag.pointerStartY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < INPUT_THRESHOLD) {
      return;
    }
    drag.axis ??= this.axisWithLegalMove(drag, deltaX, deltaY);
    if (!drag.axis) {
      this.bounceToSnapshot(drag.view);
      return;
    }

    const delta = drag.axis === "horizontal" ? deltaX : deltaY;
    const direction = drag.axis === "horizontal"
      ? delta < 0 ? "left" : "right"
      : delta < 0 ? "up" : "down";
    const distance = Math.min(
      Math.round(
        Math.abs(delta) / this.layout.cellSize + SNAP_ASSIST_RATIO,
      ),
      drag.maximumDistances[direction],
    );
    if (distance < 1) {
      this.bounceToSnapshot(drag.view);
      return;
    }

    this.interactionLocked = true;
    const accepted = this.options.store.move({
      pieceId: drag.view.piece.id,
      direction,
      distance,
    });
    if (!accepted) this.bounceToSnapshot(drag.view);
  }

  private dominantAxisForDelta(deltaX: number, deltaY: number): MovementAxis {
    return Math.abs(deltaX) >= Math.abs(deltaY) ? "horizontal" : "vertical";
  }

  private axisWithLegalMove(
    drag: DragState,
    deltaX: number,
    deltaY: number,
  ): MovementAxis | null {
    const horizontalDirection = deltaX < 0 ? "left" : "right";
    const verticalDirection = deltaY < 0 ? "up" : "down";
    const horizontalLegal = drag.maximumDistances[horizontalDirection] > 0;
    const verticalLegal = drag.maximumDistances[verticalDirection] > 0;

    if (horizontalLegal && verticalLegal) return this.dominantAxisForDelta(deltaX, deltaY);
    if (horizontalLegal) return "horizontal";
    if (verticalLegal) return "vertical";
    return null;
  }

  private maximumLegalDistances(pieceId: string): Record<Direction, number> {
    const snapshot = this.snapshot;
    const distances: Record<Direction, number> = {
      up: 0,
      down: 0,
      left: 0,
      right: 0,
    };
    if (!snapshot) return distances;

    for (const direction of DIRECTIONS) {
      const limit = direction === "left" || direction === "right"
        ? BOARD_WIDTH
        : BOARD_HEIGHT;
      for (let distance = 1; distance <= limit; distance += 1) {
        if (!applyMove(snapshot.board, this.options.level, {
          pieceId,
          direction,
          distance,
        })) {
          break;
        }
        distances[direction] = distance;
      }
    }
    return distances;
  }

  private handlePointerCancel = (): void => {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    this.bounceToSnapshot(drag.view);
  };

  private capturePointer = (pointer: PointerEvent): void => {
    try {
      this.game.canvas.setPointerCapture(pointer.pointerId);
    } catch {
      // The pointer may already have left the canvas or ended before capture.
    }
  };

  private bounceToSnapshot(view: PieceView): void {
    if (!this.snapshot || !this.layout) return;
    if (this.prefersReducedMotion()) {
      this.renderSnapshot(this.snapshot, false);
      return;
    }
    this.interactionLocked = true;
    const destination = this.positionForPiece(view.piece.id, this.snapshot);
    this.tweens.killTweensOf(view.container);
    this.tweens.add({
      targets: view.container,
      x: destination.x,
      y: destination.y,
      scaleX: 1,
      scaleY: 1,
      duration: MOVE_DURATION,
      ease: "Back.Out",
      onComplete: () => {
        this.interactionLocked = false;
        this.clearSelection();
      },
    });
  }

  private handleStoreChange = (): void => {
    const nextSnapshot = this.options.store.getSnapshot();
    if (nextSnapshot.status === "playing") {
      this.winAnimationPlayed = false;
      this.victoryCelebrationCompleted = false;
      if (this.victoryFinishTimer || this.victoryParticles) {
        this.cameras.main.resetFX();
        this.cleanupVictoryCelebration();
      }
      for (const view of this.pieceViews.values()) view.container.setAlpha(1);
    }
    this.snapshot = nextSnapshot;
    this.renderSnapshot(nextSnapshot, true);
  };

  private renderSnapshot(snapshot: GameSnapshot, animate: boolean): void {
    if (!this.layout) return;
    const shouldAnimate = animate && !this.prefersReducedMotion();
    this.interactionLocked = shouldAnimate || snapshot.status === "won";

    if (snapshot.status === "won") {
      this.pieceViews.forEach((view) => view.setInputEnabled(false));
      this.clearSelection();
    }

    let pending = 0;
    const finishAnimations = () => {
      if (pending > 0) return;
      if (snapshot.status === "won") {
        this.playExitAnimation();
      } else {
        this.interactionLocked = false;
        this.clearSelection();
      }
    };

    for (const piece of this.options.level.pieces) {
      const view = this.pieceViews.get(piece.id);
      if (!view) continue;
      this.tweens.killTweensOf(view.container);
      if (snapshot.status === "playing") view.container.setAlpha(1);
      const destination = this.positionForPiece(piece.id, snapshot);
      const hasMoved =
        Math.abs(view.container.x - destination.x) > 0.5 ||
        Math.abs(view.container.y - destination.y) > 0.5;

      if (!shouldAnimate || !hasMoved) {
        view.setCenterPosition(destination.x, destination.y);
        view.container.setScale(1);
        continue;
      }

      pending += 1;
      this.tweens.add({
        targets: view.container,
        x: destination.x,
        y: destination.y,
        scaleX: 1,
        scaleY: 1,
        duration: MOVE_DURATION,
        ease: "Back.Out",
        onComplete: () => {
          if (snapshot.status === "playing" && !this.options.readOnly) view.flashLanding();
          pending -= 1;
          finishAnimations();
        },
      });
    }

    if (!animate || pending === 0) finishAnimations();
  }

  private playExitAnimation(): void {
    if (this.winAnimationPlayed) return;
    if (!this.layout) {
      this.completeVictoryCelebration();
      return;
    }
    if (this.prefersReducedMotion()) {
      this.interactionLocked = false;
      this.completeVictoryCelebration();
      return;
    }
    this.winAnimationPlayed = true;
    this.interactionLocked = true;
    const target = this.pieceViews.get(this.options.level.targetPieceId);
    if (!target) {
      if (!this.options.readOnly) this.completeVictoryCelebration();
      return;
    }

    this.tweens.add({
      targets: target.container,
      y: target.container.y + this.layout.cellSize * 1.15,
      alpha: 0,
      scaleX: 0.92,
      scaleY: 0.92,
      duration: 760,
      ease: "Cubic.InOut",
    });
    if (this.options.readOnly) return;
    this.playVictoryEffects();
  }

  private createWinParticleTexture(): void {
    if (this.textures.exists(WIN_PARTICLE_TEXTURE_KEY)) return;

    const textureGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    textureGraphics.fillStyle(0xffffff, 1);
    textureGraphics.fillRoundedRect(0, 0, 6, 11, 1.5);
    textureGraphics.generateTexture(WIN_PARTICLE_TEXTURE_KEY, 6, 11);
    textureGraphics.destroy();
  }

  private playVictoryEffects(): void {
    if (!this.layout) return;

    const centerX = this.layout.gridX + BOARD_WIDTH * this.layout.cellSize / 2;
    const centerY = this.layout.gridY + BOARD_HEIGHT * this.layout.cellSize * 0.42;
    this.cameras.main.flash(250, 255, 239, 197);
    this.cameras.main.shake(170, 0.0022);

    this.victoryParticles = this.add.particles(centerX, centerY, WIN_PARTICLE_TEXTURE_KEY, {
      angle: { min: 210, max: 330 },
      alpha: { start: 1, end: 0 },
      color: [0xffdc82, 0xfff1c9, 0xc9563d, 0x7d9a68],
      emitting: false,
      gravityY: 230,
      lifespan: { min: 720, max: 1120 },
      quantity: 38,
      rotate: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0.08 },
      speed: { min: 105, max: 265 },
    });
    this.victoryParticles.explode(38);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, this.handleVictorySkip, this);
    this.input.keyboard?.once(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.handleVictorySkip,
      this,
    );
    this.victoryFinishTimer = this.time.delayedCall(1400, () => {
      this.completeVictoryCelebration();
    });
  }

  private completeVictoryCelebration(skipped = false): void {
    if (this.victoryCelebrationCompleted) return;
    this.victoryCelebrationCompleted = true;
    this.cleanupVictoryCelebration();

    if (skipped) {
      this.cameras.main.resetFX();
      const target = this.pieceViews.get(this.options.level.targetPieceId);
      if (target) this.tweens.killTweensOf(target.container);
      this.placeWonTargetAtExit();
    }

    this.options.onVictoryCelebrationComplete?.();
  }

  private cleanupVictoryCelebration(): void {
    this.victoryFinishTimer?.remove(false);
    this.victoryFinishTimer = null;
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleVictorySkip, this);
    this.input.keyboard?.off(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.handleVictorySkip,
      this,
    );
    this.victoryParticles?.destroy();
    this.victoryParticles = null;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }

  private positionForPiece(
    pieceId: string,
    snapshot: GameSnapshot,
  ): { x: number; y: number } {
    const layout = this.layout!;
    const view = this.pieceViews.get(pieceId)!;
    const position = snapshot.board.positions[pieceId];
    return {
      x: layout.gridX + position.x * layout.cellSize + view.piece.width * layout.cellSize / 2,
      y: layout.gridY + position.y * layout.cellSize + view.piece.height * layout.cellSize / 2,
    };
  }

  private clearSelection(): void {
    this.selectedPieceId = null;
    for (const view of this.pieceViews.values()) {
      view.setSelection(false);
    }
  }

  private redrawBoard = (): void => {
    if (!this.boardGraphics) return;

    const activeDrag = this.drag;
    const activePointer = activeDrag ? this.input.activePointer : undefined;
    const preserveDrag = Boolean(
      activeDrag &&
        activePointer?.id === activeDrag.pointerId &&
        activePointer.isDown,
    );

    const width = this.scale.width;
    const height = this.scale.height;
    const cellSize = Math.min(
      (width - 48 - FRAME_SIZE * 2) / BOARD_WIDTH,
      (height - 48 - FRAME_SIZE * 2) / BOARD_HEIGHT,
      MAX_CELL_SIZE,
    );
    if (!Number.isFinite(cellSize) || cellSize <= 0) return;

    const preserveWonAnimation = this.snapshot?.status === "won" && this.winAnimationPlayed;
    if (this.hasLaidOut) {
      for (const view of this.pieceViews.values()) {
        this.tweens.killTweensOf(view.container);
        if (!preserveWonAnimation) view.container.setAlpha(1);
      }
      this.drag = null;
      this.interactionLocked = false;
      if (!preserveWonAnimation) this.winAnimationPlayed = false;
      this.clearSelection();
    }

    const boardWidth = cellSize * BOARD_WIDTH;
    const boardHeight = cellSize * BOARD_HEIGHT;
    const frameWidth = boardWidth + FRAME_SIZE * 2;
    const frameHeight = boardHeight + FRAME_SIZE * 2;
    const frameX = (width - frameWidth) / 2;
    const frameY = (height - frameHeight - 18) / 2;
    const gridX = frameX + FRAME_SIZE;
    const gridY = frameY + FRAME_SIZE;
    this.layout = { gridX, gridY, cellSize };

    const graphics = this.boardGraphics;
    graphics.clear();
    graphics.fillStyle(0x342419, 0.2);
    graphics.fillRoundedRect(frameX + 5, frameY + 8, frameWidth, frameHeight, 19);
    graphics.fillStyle(0x4f3827, 1);
    graphics.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 18);
    graphics.lineStyle(1.2, 0xe0bd78, 0.66);
    graphics.strokeRoundedRect(frameX + 1, frameY + 1, frameWidth - 2, frameHeight - 2, 17);
    graphics.fillStyle(0x896844, 1);
    graphics.fillRoundedRect(frameX + 3, frameY + 3, frameWidth - 6, frameHeight - 6, 15);
    graphics.fillStyle(0x513a29, 1);
    graphics.fillRoundedRect(frameX + 6, frameY + 6, frameWidth - 12, frameHeight - 12, 11);

    graphics.lineStyle(1, 0x342419, 0.22);
    for (let grain = 0; grain < 3; grain += 1) {
      const inset = 3 + grain * 2.6;
      graphics.lineBetween(frameX + FRAME_SIZE * 0.6, frameY + inset, frameX + frameWidth - FRAME_SIZE * 0.6, frameY + inset);
      graphics.lineBetween(frameX + FRAME_SIZE * 0.6, frameY + frameHeight - inset, frameX + frameWidth - FRAME_SIZE * 0.6, frameY + frameHeight - inset);
      graphics.lineBetween(frameX + inset, frameY + FRAME_SIZE * 0.6, frameX + inset, frameY + frameHeight - FRAME_SIZE * 0.6);
      graphics.lineBetween(frameX + frameWidth - inset, frameY + FRAME_SIZE * 0.6, frameX + frameWidth - inset, frameY + frameHeight - FRAME_SIZE * 0.6);
    }
    graphics.fillStyle(0xe2c27f, 0.78);
    for (const x of [frameX + 6, frameX + frameWidth - 6]) {
      for (const y of [frameY + 6, frameY + frameHeight - 6]) {
        graphics.fillCircle(x, y, 1.5);
      }
    }

    graphics.fillStyle(0xeee4d1, 1);
    graphics.fillRoundedRect(gridX, gridY, boardWidth, boardHeight, 7);

    for (let row = 0; row < BOARD_HEIGHT; row += 1) {
      for (let column = 0; column < BOARD_WIDTH; column += 1) {
        const tint = (row + column) % 2 === 0 ? 0xf1e8d7 : 0xe7dbc3;
        graphics.fillStyle(tint, 1);
        graphics.fillRect(
          gridX + column * cellSize + 1,
          gridY + row * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
        );
      }
    }

    graphics.lineStyle(1, 0xb6a27d, 0.74);
    for (let column = 1; column < BOARD_WIDTH; column += 1) {
      const x = gridX + column * cellSize;
      graphics.lineBetween(x, gridY + 1, x, gridY + boardHeight - 1);
    }
    for (let row = 1; row < BOARD_HEIGHT; row += 1) {
      const y = gridY + row * cellSize;
      graphics.lineBetween(gridX + 1, y, gridX + boardWidth - 1, y);
    }

    const exitX = gridX + cellSize;
    const exitWidth = cellSize * 2;
    graphics.fillStyle(0xefe9dc, 1);
    graphics.fillRect(exitX + 2, gridY + boardHeight - 2, exitWidth - 4, FRAME_SIZE + 7);
    graphics.lineStyle(2, 0xa83d32, 0.9);
    graphics.lineBetween(
      exitX + cellSize * 0.42,
      gridY + boardHeight + FRAME_SIZE + 2,
      exitX + exitWidth - cellSize * 0.42,
      gridY + boardHeight + FRAME_SIZE + 2,
    );
    graphics.fillStyle(0xa83d32, 1);
    graphics.fillTriangle(
      width / 2,
      gridY + boardHeight + FRAME_SIZE + 10,
      width / 2 - 5,
      gridY + boardHeight + FRAME_SIZE + 4,
      width / 2 + 5,
      gridY + boardHeight + FRAME_SIZE + 4,
    );

    if (this.snapshot) {
      for (const view of this.pieceViews.values()) view.resize(cellSize);
      this.renderSnapshot(this.snapshot, false);
      if (preserveWonAnimation) this.placeWonTargetAtExit();

      if (
        preserveDrag &&
        activeDrag &&
        activePointer?.id === activeDrag.pointerId &&
        activePointer.isDown
      ) {
        const maximumDistances = this.maximumLegalDistances(activeDrag.view.piece.id);
        this.drag = {
          ...activeDrag,
          pointerStartX: activePointer.worldX,
          pointerStartY: activePointer.worldY,
          viewStartX: activeDrag.view.container.x,
          viewStartY: activeDrag.view.container.y,
          moved: false,
          axis: null,
          maximumDistances,
        };
        this.selectedPieceId = activeDrag.view.piece.id;
        activeDrag.view.setSelection(
          true,
          new Set(DIRECTIONS.filter((direction) => maximumDistances[direction] > 0)),
        );
      }
    }
    this.hasLaidOut = true;
  };

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.redrawBoard, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.finishPointer, this);
    this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.finishPointer, this);
    this.game.canvas.removeEventListener("pointerdown", this.capturePointer);
    this.game.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    this.game.canvas.removeEventListener("touchcancel", this.handlePointerCancel);
    this.cameras.main.resetFX();
    this.cleanupVictoryCelebration();
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
  }

  private placeWonTargetAtExit(): void {
    if (!this.snapshot || !this.layout) return;
    const target = this.pieceViews.get(this.options.level.targetPieceId);
    if (!target) return;
    const destination = this.positionForPiece(target.piece.id, this.snapshot);
    target.setCenterPosition(destination.x, destination.y + this.layout.cellSize * 1.15);
    target.container.setAlpha(0);
  }
}
