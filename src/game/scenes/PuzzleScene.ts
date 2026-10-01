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
  getPieceArtworkTextureKey,
  getPieceArtworkUrl,
  IMAGE_PIECE_THEMES,
  PIECE_ARTWORK_IDS,
  type PieceTheme,
} from "../../appearance/pieceTheme";

const FRAME_SIZE = 13;
const MAX_CELL_SIZE = 102;
const MOVE_DURATION = 150;
const INPUT_THRESHOLD = 10;
const SNAP_ASSIST_RATIO = 0.3;

const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

type PuzzleSceneOptions = {
  level: Level;
  store: GameStore;
  pieceLabels: Record<PieceRoleId, string>;
  pieceTheme: PieceTheme;
  readOnly?: boolean;
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
  private boardGraphics!: Phaser.GameObjects.Graphics;
  private readonly pieceViews = new Map<string, PieceView>();
  private layout: BoardLayout | null = null;
  private snapshot: GameSnapshot | null = null;
  private drag: DragState | null = null;
  private selectedPieceId: string | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private interactionLocked = false;
  private winAnimationPlayed = false;
  private hasLaidOut = false;

  constructor(options: PuzzleSceneOptions) {
    super("PuzzleScene");
    this.options = options;
    this.pieceLabels = options.pieceLabels;
    this.pieceTheme = options.pieceTheme;
  }

  preload(): void {
    for (const theme of IMAGE_PIECE_THEMES) {
      for (const artworkId of PIECE_ARTWORK_IDS) {
        this.load.image(
          getPieceArtworkTextureKey(theme, artworkId),
          getPieceArtworkUrl(theme, artworkId),
        );
      }
    }
  }

  create(): void {
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
    this.pieceTheme = pieceTheme;
    for (const view of this.pieceViews.values()) {
      view.setPieceTheme(pieceTheme);
    }
  }

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
    if (!drag.moved && Math.hypot(deltaX, deltaY) < INPUT_THRESHOLD) return;
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
        continue;
      }

      pending += 1;
      this.tweens.add({
        targets: view.container,
        x: destination.x,
        y: destination.y,
        duration: MOVE_DURATION,
        ease: "Cubic.Out",
        onComplete: () => {
          pending -= 1;
          finishAnimations();
        },
      });
    }

    if (!animate || pending === 0) finishAnimations();
  }

  private playExitAnimation(): void {
    if (this.winAnimationPlayed || !this.layout) return;
    if (this.prefersReducedMotion()) {
      this.interactionLocked = false;
      return;
    }
    this.winAnimationPlayed = true;
    this.interactionLocked = true;
    const target = this.pieceViews.get(this.options.level.targetPieceId);
    if (!target) return;

    this.tweens.add({
      targets: target.container,
      y: target.container.y + this.layout.cellSize * 1.15,
      alpha: 0,
      duration: 360,
      ease: "Cubic.In",
    });
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
    graphics.fillStyle(0x6f5237, 0.1);
    graphics.fillRoundedRect(frameX + 5, frameY + 8, frameWidth, frameHeight, 19);
    graphics.fillStyle(0xb78b5c, 1);
    graphics.fillRoundedRect(frameX, frameY, frameWidth, frameHeight, 18);
    graphics.fillStyle(0x8b6542, 0.32);
    graphics.fillRoundedRect(frameX + 4, frameY + 4, frameWidth - 8, frameHeight - 8, 14);
    graphics.fillStyle(0xf0e5cf, 1);
    graphics.fillRoundedRect(gridX, gridY, boardWidth, boardHeight, 7);

    for (let row = 0; row < BOARD_HEIGHT; row += 1) {
      for (let column = 0; column < BOARD_WIDTH; column += 1) {
        const tint = (row + column) % 2 === 0 ? 0xf6eedf : 0xeee3d0;
        graphics.fillStyle(tint, 1);
        graphics.fillRect(
          gridX + column * cellSize + 1,
          gridY + row * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
        );
      }
    }

    graphics.lineStyle(1, 0xcbb99a, 0.72);
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
    graphics.fillStyle(0xf4f0e8, 1);
    graphics.fillRect(exitX + 2, gridY + boardHeight - 2, exitWidth - 4, FRAME_SIZE + 7);
    graphics.lineStyle(2, 0xb74334, 0.75);
    graphics.lineBetween(
      exitX + cellSize * 0.42,
      gridY + boardHeight + FRAME_SIZE + 2,
      exitX + exitWidth - cellSize * 0.42,
      gridY + boardHeight + FRAME_SIZE + 2,
    );
    graphics.fillStyle(0xb74334, 0.9);
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
