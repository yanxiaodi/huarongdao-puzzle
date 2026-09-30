import { Trans, useTranslation } from "react-i18next";

type HomeScreenProps = {
  ready: boolean;
  hasUnfinishedGame: boolean;
  onContinue: () => void;
  onBrowseLevels: () => void;
};

export function HomeScreen({
  ready,
  hasUnfinishedGame,
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
        <h1 id="home-title">
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

      <div aria-hidden="true" className="hero-seal">
        <div className="seal-orbit seal-orbit--outer" />
        <div className="seal-orbit seal-orbit--inner" />
        <div className="seal-center">
          <span className="seal-kicker">{t("home.sealKicker")}</span>
          <strong>{t("home.sealTitle")}</strong>
          <span className="seal-caption">{t("home.sealCaption")}</span>
        </div>
        <span className="seal-spark seal-spark--one">✦</span>
        <span className="seal-spark seal-spark--two">✧</span>
      </div>
    </section>
  );
}
