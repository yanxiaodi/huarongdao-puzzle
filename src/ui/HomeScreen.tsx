import { Trans, useTranslation } from "react-i18next";
import type { Level, PieceRoleId } from "../data/levelSchema";

type HomeScreenProps = {
  ready: boolean;
  hasUnfinishedGame: boolean;
  heroLevel: Level | null;
  pieceLabels: Record<PieceRoleId, string>;
  onContinue: () => void;
  onBrowseLevels: () => void;
};

export function HomeScreen({
  ready,
  hasUnfinishedGame,
  heroLevel,
  pieceLabels,
  onContinue,
  onBrowseLevels,
}: HomeScreenProps) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="home-title" className="home-layout">
      <div className="intro-copy">
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-rule" />
          {t("home.eyebrow")}
        </p>
        <h1 data-modal-return-focus id="home-title" tabIndex={-1}>
          {t("home.titleFirst")}
          <br />
          <span>{t("home.titleSecond")}</span>
        </h1>
        <p className="intro-description">
          {t("home.descriptionFirst")}
          <br />
          {t("home.descriptionSecond")}
        </p>
        <div className="intro-actions">
          <button
            className="button button--primary"
            disabled={!ready}
            onClick={onContinue}
            type="button"
          >
            {t(ready ? (hasUnfinishedGame ? "home.continueAction" : "home.startFirstLevel") : "game.loading")}
            <span aria-hidden="true">↗</span>
          </button>
          <button
            className="button button--quiet"
            onClick={onBrowseLevels}
            type="button"
          >
            {t("home.levelsAction")}
          </button>
        </div>
        <div className="home-facts">
          <span><Trans i18nKey="home.levelsLabel" count={406} components={{ count: <strong /> }} /></span>
          <span className="fact-divider" />
          <span><Trans i18nKey="home.difficultyLabel" count={7} components={{ count: <strong /> }} /></span>
        </div>
      </div>

      <div aria-hidden="true" className="hero-board-scene">
        <div className="hero-board-frame">
          <div className="hero-board-topline">
            <span>{t("home.sealKicker")}</span>
            <span>4 × 5</span>
          </div>
          <div className="hero-board-grid">
            {heroLevel?.pieces.map((piece) => {
              const roleClass = piece.id === heroLevel.targetPieceId
                ? "target"
                : piece.roleId.startsWith("general-")
                  ? "general"
                  : "soldier";
              return (
                <span
                  className={`hero-mini-piece hero-mini-piece--${roleClass}`}
                  key={piece.id}
                  style={{
                    gridColumn: `${piece.x + 1} / span ${piece.width}`,
                    gridRow: `${piece.y + 1} / span ${piece.height}`,
                  }}
                >
                  {compactPieceLabel(pieceLabels[piece.roleId])}
                </span>
              );
            })}
          </div>
          <div className="hero-board-exit">
            <span aria-hidden="true" className="hero-exit-rule" />
            <span>{t("home.sealCaption")}</span>
            <span aria-hidden="true" className="hero-exit-arrow">↓</span>
          </div>
        </div>
        <span className="hero-board-stamp">{t("home.sealTitle")}</span>
      </div>
    </section>
  );
}

function compactPieceLabel(label: string): string {
  const characters = [...label];
  const ideographs = characters.filter((character) => /[\u3400-\u9fff]/.test(character));
  if (ideographs.length > 0) return ideographs.slice(0, 2).join("");
  return characters
    .filter((character) => /[a-z]/i.test(character))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
