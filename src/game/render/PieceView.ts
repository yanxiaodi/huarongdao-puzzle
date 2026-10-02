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
  target: { fill: 0x96382f, edge: 0xe2c27f, text: "#fff4dc", shadow: 0x4a2824 },
  general: { fill: 0x9aa99b, edge: 0x506657, text: "#29392f", shadow: 0x36483b },
  soldier: { fill: 0xe9dfca, edge: 0x927a59, text: "#51432f", shadow: 0x675a4a },
} as const;

export class PieceView {
  private readonly scene: Phaser.Scene;
  readonly container: Phaser.GameObjects.Container;
  private readonly liftShadow: Phaser.GameObjects.Graphics;
  private readonly settleGlow: Phaser.GameObjects.Graphics;
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly themeImage: Phaser.GameObjects.Image;
  private readonly ornament: Phaser.GameObjects.Graphics;
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
    this.scene = scene;
    this.labelText = label;
    this.pieceTheme = pieceTheme;
    this.container = scene.add.container(0, 0);
    this.liftShadow = scene.add.graphics();
    this.liftShadow.setVisible(false);
    this.settleGlow = scene.add.graphics();
    this.settleGlow.setVisible(false);
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
    this.label = scene.add.text(0, 0, label, {
      align: "center",
      color: PALETTES.soldier.text,
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontStyle: "bold",
      padding: { left: 1, right: 1, top: 1, bottom: 1 },
      resolution: 2,
    }).setOrigin(0.5);
    this.container.add([
      this.liftShadow,
      this.settleGlow,
      this.art,
      this.themeImage,
      this.ornament,
      this.hintGraphics,
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
    this.drawLiftShadow();
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
    const selectionChanged = this.selected !== selected;
    this.selected = selected;
    this.directions = new Set(directions);
    this.drawLiftShadow();
    this.drawHints();

    if (!selectionChanged) return;

    this.scene.tweens.killTweensOf(this.container);
    const selectedScale = selected ? 1.055 : 1;
    if (this.prefersReducedMotion()) {
      this.container.setScale(selectedScale);
      return;
    }
    this.scene.tweens.add({
      targets: this.container,
      scaleX: selectedScale,
      scaleY: selectedScale,
      duration: selected ? 155 : 135,
      ease: selected ? "Back.Out" : "Sine.Out",
    });
  }

  flashLanding(): void {
    const inset = Math.max(2, this.cellSize * 0.025);
    this.settleGlow.clear();
    this.settleGlow.fillStyle(0xd5b46f, 0.1);
    this.settleGlow.fillRoundedRect(
      -this.viewWidth / 2 - inset,
      -this.viewHeight / 2 - inset,
      this.viewWidth + inset * 2,
      this.viewHeight + inset * 2,
      Math.min(this.cellSize * 0.2, 16),
    );
    this.settleGlow.lineStyle(Math.max(1.5, this.cellSize * 0.018), 0xe9c779, 0.86);
    this.settleGlow.strokeRoundedRect(
      -this.viewWidth / 2 - inset,
      -this.viewHeight / 2 - inset,
      this.viewWidth + inset * 2,
      this.viewHeight + inset * 2,
      Math.min(this.cellSize * 0.2, 16),
    );
    this.scene.tweens.killTweensOf(this.settleGlow);
    this.settleGlow.setAlpha(0.78).setVisible(true);
    this.scene.tweens.add({
      targets: this.settleGlow,
      alpha: 0,
      duration: 360,
      ease: "Cubic.Out",
      onComplete: () => this.settleGlow.setVisible(false),
    });
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
    this.art.lineStyle(1, 0xfff4dc, 0.24);
    this.art.lineBetween(left + inset + 5, top + inset + 2, left + width - inset - 5, top + inset + 2);

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

  private drawLiftShadow(): void {
    this.liftShadow.clear();
    this.liftShadow.setVisible(this.selected);
    if (!this.selected) return;

    const spread = this.cellSize * 0.055;
    const shadowY = this.viewHeight / 2 + this.cellSize * 0.055;
    const layers = [
      { width: 1.14, height: 0.34, alpha: 0.018 },
      { width: 1.04, height: 0.27, alpha: 0.022 },
      { width: 0.94, height: 0.2, alpha: 0.028 },
      { width: 0.84, height: 0.14, alpha: 0.036 },
    ];
    for (const layer of layers) {
      this.liftShadow.fillStyle(0x30271e, layer.alpha);
      this.liftShadow.fillEllipse(
        0,
        shadowY,
        this.viewWidth * layer.width + spread,
        this.cellSize * layer.height + spread,
      );
    }
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
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
      this.hintGraphics.fillStyle(0x62472b, 0.97);
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
