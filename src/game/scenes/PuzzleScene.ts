import Phaser from "phaser";

const BOARD_COLUMNS = 4;
const BOARD_ROWS = 5;
const FRAME_SIZE = 13;
const MAX_CELL_SIZE = 102;

export class PuzzleScene extends Phaser.Scene {
  private boardGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super("PuzzleScene");
  }

  create() {
    this.boardGraphics = this.add.graphics();
    this.redrawBoard();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.redrawBoard, this);
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this,
    );
  }

  private redrawBoard() {
    if (!this.boardGraphics) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const cellSize = Math.min(
      (width - 48 - FRAME_SIZE * 2) / BOARD_COLUMNS,
      (height - 48 - FRAME_SIZE * 2) / BOARD_ROWS,
      MAX_CELL_SIZE,
    );

    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      return;
    }

    const boardWidth = cellSize * BOARD_COLUMNS;
    const boardHeight = cellSize * BOARD_ROWS;
    const frameWidth = boardWidth + FRAME_SIZE * 2;
    const frameHeight = boardHeight + FRAME_SIZE * 2;
    const frameX = (width - frameWidth) / 2;
    const frameY = (height - frameHeight - 18) / 2;
    const gridX = frameX + FRAME_SIZE;
    const gridY = frameY + FRAME_SIZE;

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

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let column = 0; column < BOARD_COLUMNS; column += 1) {
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
    for (let column = 1; column < BOARD_COLUMNS; column += 1) {
      const x = gridX + column * cellSize;
      graphics.lineBetween(x, gridY + 1, x, gridY + boardHeight - 1);
    }
    for (let row = 1; row < BOARD_ROWS; row += 1) {
      const y = gridY + row * cellSize;
      graphics.lineBetween(gridX + 1, y, gridX + boardWidth - 1, y);
    }

    // Keep the centered bottom exit visually open for the target piece.
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
  }

  private handleShutdown() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.redrawBoard, this);
  }
}