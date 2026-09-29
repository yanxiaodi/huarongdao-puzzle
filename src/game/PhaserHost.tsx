import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PuzzleScene } from "./scenes/PuzzleScene";

type PhaserHostProps = {
  ariaLabel: string;
};

export function PhaserHost({ ariaLabel }: PhaserHostProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = mountRef.current;
    if (!parent) {
      return undefined;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent,
      transparent: true,
      backgroundColor: "rgba(0, 0, 0, 0)",
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        roundPixels: true,
      },
      scene: [BootScene, PuzzleScene],
      disableContextMenu: true,
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
      parent.replaceChildren();
    };
  }, []);

  return (
    <div
      aria-label={ariaLabel}
      role="group"
      className="phaser-host"
      ref={mountRef}
    />
  );
}