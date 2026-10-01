import Phaser from "phaser";
import type { Piece } from "../../data/levelSchema";
import type { Direction } from "../domain/types";
import {
  getPieceArtworkId,
  getPieceArtworkTextureKey,
  type ImagePieceTheme,
  type PieceTheme,
} from "../../appearance/pieceTheme";

const PALETTES = {
  target: { fill: 0x963f37, edge: 0xe2c27f, text: "#fff4dc", shadow: 0x4a2824 },
  general: { fill: 0xd8ddd3, edge: 0x657568, text: "#354238", shadow: 0x4c5148 },
  soldier: { fill: 0xe7ddcb, edge: 0x9c8667, text: "#584a39", shadow: 0x675a4a },
} as const;

export class PieceView {
  readonly container: Phaser.GameObjects.Container;
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly themeImage: Phaser.GameObjects.Image;
  private readonly ornament: Phaser.GameObjects.Graphics;
  private readonly selection: Phaser.GameObjects.Graphics;
  private readonly hintGraphics: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private cellSize = 0;
  private viewWidth = 0;
  private viewHeight = 0;
  private selected = false;
  private directions = new Set<Direction>();
  private labelText: string;
  private pieceTheme: PieceTheme;

  constructor(
    scene: Phaser.Scene,
    readonly piece: Piece,
    label: string,
    pieceTheme: PieceTheme,
  ) {
    this.labelText = label;
    this.pieceTheme = pieceTheme;
    this.container = scene.add.container(0, 0);
    this.art = scene.add.graphics();
    const imageTexture = pieceTheme === "text"
      ? "__MISSING"
      : getPieceArtworkTextureKey(pieceTheme, getPieceArtworkId(piece));
    this.themeImage = scene.add.image(
      0,
      0,
      imageTexture,
    );
    this.ornament = scene.add.graphics();
    this.hintGraphics = scene.add.graphics();
    this.selection = scene.add.graphics();
    this.label = scene.add.text(0, 0, label, {
      align: "center",
      color: PALETTES.soldier.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontStyle: "bold",
      padding: { left: 1, right: 1, top: 1, bottom: 1 },
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add([
      this.art,
      this.themeImage,
      this.ornament,
      this.hintGraphics,
      this.selection,
      this.label,
    ]);
    this.container.setData("pieceId", piece.id);
    this.applyPieceTheme();
  }

  resize(cellSize: number): void {
    this.cellSize = cellSize;
    this.viewWidth = this.piece.width * cellSize;
    this.viewHeight = this.piece.height * cellSize;
    this.container.setSize(this.viewWidth, this.viewHeight);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.viewWidth, this.viewHeight),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.container.input) this.container.input.cursor = "grab";
    this.drawArt();
    this.layoutLabel();
    this.applyPieceTheme();
    this.drawSelection();
    this.drawHints();
  }

  setBoardPosition(gridX: number, gridY: number, x: number, y: number): void {
    this.container.setPosition(
      gridX + x * this.cellSize + this.viewWidth / 2,
      gridY + y * this.cellSize + this.viewHeight / 2,
    );
  }

  setCenterPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setLabel(label: string): void {
    this.labelText = label;
    this.layoutLabel();
  }

  setPieceTheme(pieceTheme: PieceTheme): void {
    this.pieceTheme = pieceTheme;
    this.applyPieceTheme();
  }

  setSelection(selected: boolean, directions: ReadonlySet<Direction> = new Set()): void {
    this.selected = selected;
    this.directions = new Set(directions);
    this.drawSelection();
    this.drawHints();
  }

  setInputEnabled(enabled: boolean): void {
    if (enabled) {
      this.container.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, this.viewWidth, this.viewHeight),
        Phaser.Geom.Rectangle.Contains,
      );
      if (this.container.input) this.container.input.cursor = "grab";
    } else {
      this.container.disableInteractive();
    }
  }

  private palette() {
    if (this.piece.roleId === "cao-cao") return PALETTES.target;
    return this.piece.roleId.startsWith("general-")
      ? PALETTES.general
      : PALETTES.soldier;
  }

  private drawArt(): void {
    const width = this.viewWidth;
    const height = this.viewHeight;
    const left = -width / 2;
    const top = -height / 2;
    const inset = Math.max(3, this.cellSize * 0.065);
    const radius = Math.min(this.cellSize * 0.16, 15);
    const palette = this.palette();

    this.art.clear();
    this.art.fillStyle(palette.shadow, 0.2);
    this.art.fillRoundedRect(left + 3, top + 5, width - 6, height - 6, radius);
    this.art.fillStyle(palette.fill, 1);
    this.art.fillRoundedRect(left + 1, top + 1, width - 2, height - 5, radius);
    this.art.lineStyle(1.5, palette.edge, 0.9);
    this.art.strokeRoundedRect(left + inset, top + inset, width - inset * 2, height - inset * 2 - 3, radius * 0.72);

    this.ornament.clear();
    if (this.piece.roleId === "cao-cao") {
      const corner = Math.max(7, this.cellSize * 0.15);
      this.ornament.fillStyle(palette.edge, 0.9);
      for (const x of [left + inset + 3, -left - inset - 3]) {
        for (const y of [top + inset + 3, -top - inset - 6]) {
          this.ornament.fillCircle(x, y, Math.max(1.5, this.cellSize * 0.025));
        }
      }
      this.ornament.lineStyle(1.5, palette.edge, 0.8);
      this.ornament.lineBetween(-corner, top + inset + 3, corner, top + inset + 3);
      this.ornament.lineBetween(-corner, -top - inset - 6, corner, -top - inset - 6);
    } else if (this.piece.roleId.startsWith("general-")) {
      const mark = Math.max(7, this.cellSize * 0.13);
      this.ornament.lineStyle(1, palette.edge, 0.72);
      if (this.piece.height >= this.piece.width) {
        this.ornament.lineBetween(-mark, top + inset + 3, mark, top + inset + 3);
        this.ornament.lineBetween(-mark, -top - inset - 6, mark, -top - inset - 6);
      } else {
        this.ornament.lineBetween(left + inset + 3, -mark, left + inset + 3, mark);
        this.ornament.lineBetween(-left - inset - 4, -mark, -left - inset - 4, mark);
      }
    }
  }

  private layoutLabel(): void {
    if (!this.cellSize) return;
    const palette = this.palette();
    const inset = Math.max(6, this.cellSize * 0.1);
    const maxWidth = Math.max(1, this.viewWidth - inset * 2);
    const maxHeight = Math.max(1, this.viewHeight - inset * 2);
    const emphasis = this.piece.roleId === "cao-cao" ? 0.34 : 0.24;
    const baseSize = Math.min(28, Math.max(9, this.cellSize * emphasis));
    const minSize = Math.max(8, Math.min(10, this.cellSize * 0.13));
    let fontSize = baseSize;

    this.label.setText(this.labelText);
    this.label.setColor(palette.text);
    this.label.setPosition(0, 0);
    this.label.setWordWrapWidth(maxWidth, false);

    while (fontSize > minSize) {
      this.label.setFontSize(fontSize);
      this.label.setWordWrapWidth(maxWidth, false);
      if (this.label.width <= maxWidth + 1 && this.label.height <= maxHeight + 1) break;
      fontSize -= 1;
    }

    const fitScale = Math.min(1, maxWidth / this.label.width, maxHeight / this.label.height);
    this.label.setScale(Math.max(0.72, fitScale));
  }

  private drawSelection(): void {
    this.selection.clear();
    if (!this.selected) return;

    const inset = Math.max(4, this.cellSize * 0.045);
    this.selection.lineStyle(Math.max(2, this.cellSize * 0.035), 0xffd78a, 0.98);
    this.selection.strokeRoundedRect(
      -this.viewWidth / 2 + inset,
      -this.viewHeight / 2 + inset,
      this.viewWidth - inset * 2,
      this.viewHeight - inset * 2 - 2,
      Math.min(this.cellSize * 0.13, 12),
    );
  }

  private drawHints(): void {
    this.hintGraphics.clear();
    if (!this.selected || !this.directions.size) return;

    const margin = Math.max(9, this.cellSize * 0.15);
    const points: Record<Direction, { x: number; y: number; angle: number }> = {
      up: { x: 0, y: -this.viewHeight / 2 + margin, angle: -Math.PI / 2 },
      down: { x: 0, y: this.viewHeight / 2 - margin, angle: Math.PI / 2 },
      left: { x: -this.viewWidth / 2 + margin, y: 0, angle: Math.PI },
      right: { x: this.viewWidth / 2 - margin, y: 0, angle: 0 },
    };
    const radius = Math.max(5, this.cellSize * 0.105);
    const arrowSize = Math.max(3, this.cellSize * 0.06);

    for (const direction of this.directions) {
      const point = points[direction];
      this.hintGraphics.fillStyle(0x795d38, 0.94);
      this.hintGraphics.fillCircle(point.x, point.y, radius);
      this.hintGraphics.fillStyle(0xffe5ae, 1);
      const tipX = point.x + Math.cos(point.angle) * arrowSize * 0.8;
      const tipY = point.y + Math.sin(point.angle) * arrowSize * 0.8;
      const backX = point.x - Math.cos(point.angle) * arrowSize * 0.48;
      const backY = point.y - Math.sin(point.angle) * arrowSize * 0.48;
      const sideX = Math.cos(point.angle + Math.PI / 2) * arrowSize * 0.58;
      const sideY = Math.sin(point.angle + Math.PI / 2) * arrowSize * 0.58;
      this.hintGraphics.fillTriangle(
        tipX,
        tipY,
        backX + sideX,
        backY + sideY,
        backX - sideX,
        backY - sideY,
      );
    }
  }

  private applyPieceTheme(): void {
    const showTextArtwork = this.pieceTheme === "text";
    this.art.setVisible(showTextArtwork);
    this.ornament.setVisible(showTextArtwork);
    this.label.setVisible(showTextArtwork);
    this.themeImage.setVisible(!showTextArtwork);

    if (!showTextArtwork) {
      const imageTheme = this.pieceTheme as ImagePieceTheme;
      this.themeImage.setTexture(
        getPieceArtworkTextureKey(imageTheme, getPieceArtworkId(this.piece)),
      );
      this.themeImage.setDisplaySize(this.viewWidth, this.viewHeight);
    }
  }
}
