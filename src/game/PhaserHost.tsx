import { useEffect, useRef } from "react";
import Phaser from "phaser";
import type { Level, PieceRoleId } from "../data/levelSchema";
import type { GameStore } from "./domain/types";
import { BootScene } from "./scenes/BootScene";
import { PuzzleScene } from "./scenes/PuzzleScene";

type PhaserHostProps = {
  ariaLabel: string;
  level: Level;
  store: GameStore;
  pieceLabels: Record<PieceRoleId, string>;
  readOnly?: boolean;
};

export function PhaserHost({ ariaLabel, level, store, pieceLabels, readOnly = false }: PhaserHostProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PuzzleScene | null>(null);

  useEffect(() => {
    const parent = mountRef.current;
    if (!parent) {
      return undefined;
    }

    const puzzleScene = new PuzzleScene({ level, store, pieceLabels, readOnly });
    sceneRef.current = puzzleScene;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent,
      transparent: true,
      backgroundColor: "rgba(0, 0, 0, 0)",
      input: {
        mouse: {
          target: parent,
          preventDefaultDown: true,
          preventDefaultMove: true,
          preventDefaultUp: true,
        },
        touch: { target: parent, capture: true },
        windowEvents: false,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        roundPixels: true,
      },
      scene: [BootScene, puzzleScene],
      disableContextMenu: true,
    };

    const game = new Phaser.Game(config);

    return () => {
      sceneRef.current = null;
      game.destroy(true);
      parent.replaceChildren();
    };
  }, [level, store, readOnly]);

  useEffect(() => {
    sceneRef.current?.setPieceLabels(pieceLabels);
  }, [pieceLabels]);

  return (
    <div
      aria-label={ariaLabel}
      role="group"
      className="phaser-host"
      ref={mountRef}
    />
  );
}
