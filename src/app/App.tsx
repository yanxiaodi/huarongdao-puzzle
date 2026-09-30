import { lazy, Suspense, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import i18n from "../i18n";
import { saveLocalePreference } from "../i18n/languagePreference";
import { TRANSLATIONS } from "../i18n/resources";
import { isAppLocale, LANGUAGE_OPTIONS, type AppLocale } from "../i18n/types";
import { loadLevelById } from "../data/levelCatalog";
import type { Level } from "../data/levelSchema";
import { InMemoryGameStore } from "../game/domain/GameStore";

const PhaserHost = lazy(() =>
  import("../game/PhaserHost").then(({ PhaserHost: component }) => ({
    default: component,
  })),
);

type Screen = "home" | "levels" | "game";

const screenTranslationKeys: Record<Screen, "navigation.home" | "navigation.levels" | "navigation.game"> = {
  home: "navigation.home",
  levels: "navigation.levels",
  game: "navigation.game",
};

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [defaultLevel, setDefaultLevel] = useState<Level | null>(null);
  const [gameStore, setGameStore] = useState<InMemoryGameStore | null>(null);
  const [levelLoadFailed, setLevelLoadFailed] = useState(false);
  const { t } = useTranslation();
  const activeLocale: AppLocale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";
  const pieceLabels = TRANSLATIONS[activeLocale].game.pieces;

  useEffect(() => {
    if (screen !== "game" || gameStore || levelLoadFailed) return undefined;

    let cancelled = false;
    void loadLevelById(1).then((level) => {
      if (cancelled) return;
      setDefaultLevel(level);
      setGameStore(new InMemoryGameStore(level));
    }).catch(() => {
      if (!cancelled) setLevelLoadFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [screen, gameStore, levelLoadFailed]);

  function selectLocale(locale: AppLocale) {
    if (locale === activeLocale) {
      saveLocalePreference(locale);
      return;
    }

    void i18n.changeLanguage(locale).then(() => saveLocalePreference(locale));
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <button
          aria-label={t("navigation.returnHome")}
          className="brand"
          onClick={() => setScreen("home")}
          type="button"
        >
          <span aria-hidden="true" className="brand-mark">
            {t("brand.mark")}
          </span>
          <span className="brand-copy">
            <strong>{t("brand.name")}</strong>
            <small>{t("brand.subtitle")}</small>
          </span>
        </button>

        <nav aria-label={t("navigation.label")} className="main-nav">
          {(["home", "levels", "game"] as const).map((item) => (
            <button
              aria-current={screen === item ? "page" : undefined}
              className={screen === item ? "nav-link nav-link--active" : "nav-link"}
              key={item}
              onClick={() => setScreen(item)}
              type="button"
            >
              {t(screenTranslationKeys[item])}
            </button>
          ))}
        </nav>

        <div className="masthead-tools">
          <span className="edition-chip">
            <span aria-hidden="true" className="edition-dot" />
            {t("header.edition")}
          </span>
          <div aria-label={t("language.label")} className="language-switcher" role="group">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                aria-label={option.label}
                aria-pressed={activeLocale === option.locale}
                className={activeLocale === option.locale ? "language-button language-button--active" : "language-button"}
                key={option.locale}
                onClick={() => selectLocale(option.locale)}
                title={option.label}
                type="button"
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </header>

      {screen === "home" && (
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
                onClick={() => setScreen("game")}
                type="button"
              >
                {t("home.boardAction")}
                <span aria-hidden="true">↗</span>
              </button>
              <button
                className="button button--quiet"
                onClick={() => setScreen("levels")}
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
      )}

      {screen === "levels" && (
        <section aria-labelledby="levels-title" className="content-page">
          <div className="page-heading">
            <p className="eyebrow">
              <span aria-hidden="true" className="eyebrow-rule" />
              {t("levels.eyebrow")}
            </p>
            <h1 id="levels-title">{t("levels.title")}</h1>
            <p className="intro-description">{t("levels.description")}</p>
          </div>
          <div className="level-preview">
            <span aria-hidden="true" className="level-preview-icon">棋</span>
            <div>
              <strong>{t("levels.previewTitle")}</strong>
              <p>{t("levels.previewDescription")}</p>
            </div>
          </div>
        </section>
      )}

      {screen === "game" && (
        <section aria-labelledby="game-title" className="game-layout">
          <div className="game-heading">
            <div>
              <p className="eyebrow">
                <span aria-hidden="true" className="eyebrow-rule" />
                {t("game.eyebrow")}
              </p>
              <h1 id="game-title">{t("game.title")}</h1>
            </div>
            <span className="board-size-chip">
              {t("game.columns")} <i /> {t("game.rows")}
            </span>
          </div>

          <div className="board-card">
            <div className="board-card-top">
              <span>{t("game.layout")}</span>
              <span className="board-index">{t("game.levelNumber", { number: "001" })}</span>
            </div>
            <Suspense fallback={<div aria-live="polite" className="phaser-loading">{t("game.loading")}</div>}>
              {defaultLevel && gameStore ? (
                <PhaserHost
                  ariaLabel={t("game.boardLabel")}
                  level={defaultLevel}
                  store={gameStore}
                  pieceLabels={pieceLabels}
                />
              ) : (
                <div aria-live="polite" className="phaser-loading">
                  {t(levelLoadFailed ? "game.loadError" : "game.loading")}
                </div>
              )}
            </Suspense>
            <div className="board-card-bottom">
              <span><i aria-hidden="true" className="exit-mark" /> {t("game.exit")}</span>
              <span className="board-caption">{t("game.caption")}</span>
            </div>
          </div>

          <div className="play-note">
            <span aria-hidden="true" className="note-symbol">{t("game.noteSymbol")}</span>
            <p>{t("game.note")}</p>
          </div>
        </section>
      )}

      <footer className="page-footer">
        <span>{t("footer.tagline")}</span>
        <span>{t("footer.copyright")}</span>
      </footer>
    </main>
  );
}
