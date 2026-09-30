import { useTranslation } from "react-i18next";

type GameHudProps = {
  levelId: number;
  levelName: string;
  steps: number;
  locked: boolean;
  canUndo: boolean;
  onUndo: () => void;
  onRestart: () => void;
  onBackToLevels: () => void;
};

export function GameHud({
  levelId,
  levelName,
  steps,
  locked,
  canUndo,
  onUndo,
  onRestart,
  onBackToLevels,
}: GameHudProps) {
  const { t } = useTranslation();

  function restart() {
    if (steps > 0 && !window.confirm(t("game.confirmRestart"))) return;
    onRestart();
  }

  return (
    <>
      <div className="game-heading">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" className="eyebrow-rule" />
            {t("game.levelNumber", { number: String(levelId).padStart(3, "0") })}
          </p>
          <h1 id="game-title">{levelName}</h1>
        </div>
        <div className="game-step-counter" aria-live="polite">
          <span>{t("game.stepsLabel")}</span>
          <strong>{steps}</strong>
        </div>
      </div>

      <div className="game-toolbar">
        <button className="button button--quiet" onClick={onBackToLevels} type="button">
          {t("game.backToLevels")}
        </button>
        <div className="game-action-group">
          <button className="button button--quiet" disabled={!canUndo || locked} onClick={onUndo} type="button">
            {t("game.undo")}
          </button>
          <button className="button button--quiet" disabled={locked} onClick={restart} type="button">
            {t("game.restart")}
          </button>
        </div>
      </div>
    </>
  );
}
