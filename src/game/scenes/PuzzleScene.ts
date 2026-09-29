import Phaser from "phaser";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type Level,
  type PieceRoleId,
} from "../../data/levelSchema";
import { applyMove } from "../domain/rules";
import type {
  Direction,
  GameSnapshot,
  GameStore,
} from "../domain/types";
import { PieceView } from "../render/PieceView";

const FRAME_SIZE = 13;
const MAX_CELL_SIZE = 102;
const MOVE_DURATION = 150;
const INPUT_THRESHOLD = 4;

const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

type PuzzleSceneOptions = {
  level: Level;
  store: GameStore;
  pieceLabels: Record<PieceRoleId, string>;
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
};

export class PuzzleScene extends Phaser.Scene {
  private readonly options: PuzzleSceneOptions;
  private pieceLabels: Record<PieceRoleId, string>;
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
  }

  create(): void {
    this.boardGraphics = this.add.graphics();

    for (const piece of this.options.level.pieces) {
      const view = new PieceView(
        this,
        piece,
        this.pieceLabels[piece.roleId],
      );
      this.pieceViews.set(piece.id, view);
      view.container.on(
        Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
        (pointer: Phaser.Input.Pointer) => this.beginDrag(pointer, view),
      );
    }

    this.snapshot = this.options.store.getSnapshot();
    this.unsubscribeStore = this.options.store.subscribe(this.handleStoreChange);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.redrawBoard, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.finishPointer, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.finishPointer, this);
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

  private beginDrag(pointer: Phaser.Input.Pointer, view: PieceView): void {
    if (
      !this.snapshot ||
      this.snapshot.status === "won" ||
      this.interactionLocked ||
      !this.layout
    ) {
      return;
    }

    this.clearSelection();
    this.selectedPieceId = view.piece.id;
    view.setSelection(true, this.legalDirections(view.piece.id));
    this.children.bringToTop(view.container);
    this.drag = {
      view,
      pointerId: pointer.id,
      pointerStartX: pointer.worldX,
      pointerStartY: pointer.worldY,
      viewStartX: view.container.x,
      viewStartY: view.container.y,
      moved: false,
    };
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== pointer.id || !pointer.isDown) return;

    const deltaX = pointer.worldX - drag.pointerStartX;
    const deltaY = pointer.worldY - drag.pointerStartY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < INPUT_THRESHOLD) return;

    drag.moved = true;
    drag.view.setCenterPosition(
      drag.viewStartX + deltaX,
      drag.viewStartY + deltaY,
    );
  }

  private finishPointer(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== pointer.id) return;
    this.drag = null;

    if (!drag.moved || !this.layout) return;

    const deltaX = pointer.worldX - drag.pointerStartX;
    const deltaY = pointer.worldY - drag.pointerStartY;
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    if (Math.abs(distanceX - distanceY) <= 0.5) {
      this.bounceToSnapshot(drag.view);
      return;
    }

    const isHorizontal = distanceX > distanceY;
    const distance = Math.round(
      (isHorizontal ? distanceX : distanceY) / this.layout.cellSize,
    );
    if (distance < 1) {
      this.bounceToSnapshot(drag.view);
      return;
    }

    const direction: Direction = isHorizontal
      ? deltaX < 0 ? "left" : "right"
      : deltaY < 0 ? "up" : "down";
    this.interactionLocked = true;
    const accepted = this.options.store.move({
      pieceId: drag.view.piece.id,
      direction,
      distance,
    });
    if (!accepted) this.bounceToSnapshot(drag.view);
  }

  private legalDirections(pieceId: string): Set<Direction> {
    const snapshot = this.snapshot;
    if (!snapshot) return new Set();

    return new Set(
      DIRECTIONS.filter((direction) =>
        applyMove(snapshot.board, this.options.level, {
          pieceId,
          direction,
          distance: 1,
        }) !== null,
      ),
    );
  }

  private bounceToSnapshot(view: PieceView): void {
    if (!this.snapshot || !this.layout) return;
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
    this.snapshot = nextSnapshot;
    this.renderSnapshot(nextSnapshot, true);
  };

  private renderSnapshot(snapshot: GameSnapshot, animate: boolean): void {
    if (!this.layout) return;
    this.interactionLocked = animate || snapshot.status === "won";

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
      const destination = this.positionForPiece(piece.id, snapshot);
      const hasMoved =
        Math.abs(view.container.x - destination.x) > 0.5 ||
        Math.abs(view.container.y - destination.y) > 0.5;

      if (!animate || !hasMoved) {
        this.tweens.killTweensOf(view.container);
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

    const width = this.scale.width;
    const height = this.scale.height;
    const cellSize = Math.min(
      (width - 48 - FRAME_SIZE * 2) / BOARD_WIDTH,
      (height - 48 - FRAME_SIZE * 2) / BOARD_HEIGHT,
      MAX_CELL_SIZE,
    );
    if (!Number.isFinite(cellSize) || cellSize <= 0) return;

    if (this.hasLaidOut) {
      for (const view of this.pieceViews.values()) {
        this.tweens.killTweensOf(view.container);
        view.container.setAlpha(1);
      }
      this.drag = null;
      this.interactionLocked = false;
      this.winAnimationPlayed = false;
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
    }
    this.hasLaidOut = true;
  };

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.redrawBoard, this);
    this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.finishPointer, this);
    this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.finishPointer, this);
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
  }
}
