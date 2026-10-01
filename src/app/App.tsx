import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { saveLocalePreference } from "../i18n/languagePreference";
import { TRANSLATIONS } from "../i18n/resources";
import { isAppLocale, LANGUAGE_OPTIONS, type AppLocale } from "../i18n/types";
import { loadLevelCatalog } from "../data/levelCatalog";
import type { Level } from "../data/levelSchema";
import { InMemoryGameStore } from "../game/domain/GameStore";
import { getDifficultyUnlockStatus } from "../game/domain/scoring";
import type { GameSnapshot } from "../game/domain/types";
import type { PieceTheme } from "../appearance/pieceTheme";
import { CompletionHistoryDialog } from "../ui/CompletionHistoryDialog";
import { GameHud } from "../ui/GameHud";
import { HomeScreen } from "../ui/HomeScreen";
import { LevelSelectScreen } from "../ui/LevelSelectScreen";
import { ReplayScreen } from "../ui/ReplayScreen";
import { SettingsDialog } from "../ui/SettingsDialog";
import { WinDialog } from "../ui/WinDialog";
import {
  createBrowserProgressStore,
  type ProgressStorageError,
  type ProgressStore,
} from "../progression/storage";
import {
  getCompletionRecordsForLevel,
  type CompletionRecord,
  type ProgressSnapshot,
} from "../progression/progress";

const PhaserHost = lazy(() =>
  import("../game/PhaserHost").then(({ PhaserHost: component }) => ({ default: component })),
);

type Screen = "home" | "levels" | "game" | "replay";
type ReplayReturn = "history" | "game";
type RunTimer = {
  levelId: number;
  elapsedMs: number;
  startedAt: number | null;
};

const screenTranslationKeys: Record<Exclude<Screen, "replay">, "navigation.home" | "navigation.levels" | "navigation.game"> = {
  home: "navigation.home",
  levels: "navigation.levels",
  game: "navigation.game",
};

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [levels, setLevels] = useState<readonly Level[]>([]);
  const [progressStore, setProgressStore] = useState<ProgressStore | null>(null);
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [storageError, setStorageError] = useState<ProgressStorageError | null>(null);
  const [levelLoadFailed, setLevelLoadFailed] = useState(false);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [gameStore, setGameStore] = useState<InMemoryGameStore | null>(null);
  const [gameSnapshot, setGameSnapshot] = useState<GameSnapshot | null>(null);
  const [winRecord, setWinRecord] = useState<CompletionRecord | null>(null);
  const [winRecordSaved, setWinRecordSaved] = useState(false);
  const [historyLevelId, setHistoryLevelId] = useState<number | null>(null);
  const [selectedReplay, setSelectedReplay] = useState<CompletionRecord | null>(null);
  const [replayReturn, setReplayReturn] = useState<ReplayReturn>("history");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const runTimer = useRef<RunTimer | null>(null);
  const { t } = useTranslation();
  const activeLocale: AppLocale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";
  const pieceTheme = progress?.settings.pieceTheme ?? "text";
  const pieceLabels = TRANSLATIONS[activeLocale].game.pieces;
  const levelsById = useMemo(() => new Map(levels.map((level) => [level.id, level])), [levels]);
  const completedLevelIds = useMemo(
    () => Object.keys(progress?.bestStars ?? {}).map(Number),
    [progress?.bestStars],
  );
  const selectedHistoryLevel = historyLevelId === null ? null : levelsById.get(historyLevelId) ?? null;
  const selectedHistoryRecords = useMemo(
    () => progress && historyLevelId !== null
      ? getCompletionRecordsForLevel(progress, historyLevelId)
      : [],
    [progress, historyLevelId],
  );
  const replayLevel = selectedReplay ? levelsById.get(selectedReplay.levelId) ?? null : null;
  const nextUnlockedLevel = useMemo(() => {
    if (!activeLevel) return null;
    return levels.find((level) =>
      level.id > activeLevel.id &&
      getDifficultyUnlockStatus(levels, completedLevelIds, level.difficulty).isUnlocked,
    ) ?? null;
  }, [activeLevel, levels, completedLevelIds]);

  function getElapsedMs(levelId: number): number {
    const timer = runTimer.current;
    if (!timer || timer.levelId !== levelId) return 0;
    return Math.round(timer.elapsedMs + (timer.startedAt === null ? 0 : performance.now() - timer.startedAt));
  }

  function pauseElapsedTimer(levelId: number): number {
    const timer = runTimer.current;
    if (!timer || timer.levelId !== levelId) return 0;
    if (timer.startedAt !== null) {
      timer.elapsedMs += Math.max(0, performance.now() - timer.startedAt);
      timer.startedAt = null;
    }
    return Math.round(timer.elapsedMs);
  }

  function resumeElapsedTimer(levelId: number): void {
    const timer = runTimer.current;
    if (timer?.levelId === levelId && timer.startedAt === null) {
      timer.startedAt = performance.now();
    }
  }

  useEffect(() => {
    let cancelled = false;
    void loadLevelCatalog().then((catalog) => {
      if (cancelled) return;
      const levelMap = new Map(catalog.map((level) => [level.id, level]));
      const localeAtLoad = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";
      const store = createBrowserProgressStore(localeAtLoad);
      const initialProgress = store.load(levelMap);
      saveLocalePreference(initialProgress.settings.locale);
      if (i18n.resolvedLanguage !== initialProgress.settings.locale) {
        void i18n.changeLanguage(initialProgress.settings.locale);
      }
      setLevels(catalog);
      setProgressStore(store);
      setProgress(initialProgress);
      setStorageError(store.getStorageError());
    }).catch(() => {
      if (!cancelled) setLevelLoadFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!progressStore) return undefined;
    return progressStore.subscribe((progressChanged) => {
      if (progressChanged) setProgress(progressStore.getSnapshot());
      setStorageError(progressStore.getStorageError());
    });
  }, [progressStore]);

  useEffect(() => {
    if (!gameStore || !activeLevel || !progressStore) return undefined;

    let previousStatus = gameStore.getSnapshot().status;
    const syncGame = () => {
      const snapshot = gameStore.getSnapshot();
      setGameSnapshot(snapshot);
      if (snapshot.status === "won" && previousStatus !== "won") {
        const elapsedMs = pauseElapsedTimer(activeLevel.id);
        const result = progressStore.recordWin(snapshot, activeLevel, elapsedMs);
        setWinRecord(result.record);
        setWinRecordSaved(result.saved);
      } else if (snapshot.status === "playing") {
        progressStore.saveGame(snapshot, getElapsedMs(activeLevel.id));
      }
      previousStatus = snapshot.status;
    };

    setGameSnapshot(gameStore.getSnapshot());
    return gameStore.subscribe(syncGame);
  }, [gameStore, activeLevel, progressStore]);

  useEffect(() => {
    if (!gameStore || !activeLevel || !progressStore) return undefined;

    const levelId = activeLevel.id;
    const persistElapsedTime = () => {
      if (runTimer.current?.levelId !== levelId) return;
      const elapsedMs = pauseElapsedTimer(levelId);
      const snapshot = gameStore.getSnapshot();
      if (snapshot.status === "playing") progressStore.saveGame(snapshot, elapsedMs);
    };
    const syncVisibility = () => {
      const snapshot = gameStore.getSnapshot();
      if (screen === "game" && snapshot.status === "playing" && !document.hidden) {
        resumeElapsedTimer(levelId);
      } else {
        persistElapsedTime();
      }
    };

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("pagehide", persistElapsedTime);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("pagehide", persistElapsedTime);
      persistElapsedTime();
    };
  }, [screen, gameStore, activeLevel, progressStore]);

  function isUnlocked(level: Level): boolean {
    return getDifficultyUnlockStatus(levels, completedLevelIds, level.difficulty).isUnlocked;
  }

  function openLevel(levelId: number) {
    if (!progressStore) return;
    const level = levelsById.get(levelId);
    if (!level || !isUnlocked(level)) return;

    if (activeLevel && gameStore) {
      const elapsedMs = pauseElapsedTimer(activeLevel.id);
      const currentSnapshot = gameStore.getSnapshot();
      if (currentSnapshot.status === "playing") progressStore.saveGame(currentSnapshot, elapsedMs);
    }

    const openedGame = progressStore.openLevel(level);
    const nextStore = new InMemoryGameStore(level);
    let elapsedMs = openedGame.elapsedMs;
    if (!nextStore.restore(openedGame.snapshot, level)) {
      elapsedMs = 0;
      progressStore.saveGame(nextStore.getSnapshot(), elapsedMs);
    }
    runTimer.current = { levelId: level.id, elapsedMs, startedAt: null };
    setActiveLevel(level);
    setGameStore(nextStore);
    setGameSnapshot(nextStore.getSnapshot());
    setWinRecord(null);
    setWinRecordSaved(false);
    setScreen("game");
  }

  function continueGame() {
    const levelId = progressStore?.getMostRecentUnfinishedLevelId() ?? 1;
    openLevel(levelId);
  }

  function playCurrentLevelAgain() {
    if (!activeLevel || !gameStore || !progressStore) return;

    runTimer.current = {
      levelId: activeLevel.id,
      elapsedMs: 0,
      startedAt: document.hidden ? null : performance.now(),
    };
    setWinRecord(null);
    setWinRecordSaved(false);
    gameStore.startLevel(activeLevel);
  }

  function navigateTo(target: Exclude<Screen, "replay">) {
    if (target === "game") {
      if (activeLevel && gameStore) setScreen("game");
      else continueGame();
      return;
    }
    if (screen === "game" && activeLevel && gameStore && progressStore) {
      const elapsedMs = pauseElapsedTimer(activeLevel.id);
      const snapshot = gameStore.getSnapshot();
      if (snapshot.status === "playing") progressStore.saveGame(snapshot, elapsedMs);
    }
    if (progressStore) setProgress(progressStore.getSnapshot());
    setHistoryLevelId(null);
    setScreen(target);
  }

  function changeLocale(locale: AppLocale) {
    if (locale === activeLocale) {
      saveLocalePreference(locale);
      if (progressStore) {
        progressStore.updateSettings({ ...progressStore.getSnapshot().settings, locale });
      }
      return;
    }

    void i18n.changeLanguage(locale).then(() => {
      saveLocalePreference(locale);
      if (progressStore) {
        progressStore.updateSettings({ ...progressStore.getSnapshot().settings, locale });
      }
    });
  }

  function changePieceTheme(theme: PieceTheme) {
    if (!progressStore || progressStore.getSnapshot().settings.pieceTheme === theme) return;
    progressStore.updateSettings({ ...progressStore.getSnapshot().settings, pieceTheme: theme });
  }

  function openHistory(levelId: number) {
    setHistoryLevelId(levelId);
  }

  function startReplay(record: CompletionRecord, from: ReplayReturn) {
    setSelectedReplay(record);
    setReplayReturn(from);
    setScreen("replay");
  }

  function exitReplay() {
    setSelectedReplay(null);
    setScreen(replayReturn === "game" ? "game" : "levels");
  }

  function storageErrorMessage(): string | null {
    if (storageError === "quota") return t("storage.quota");
    if (storageError === "unavailable") return t("storage.unavailable");
    if (storageError === "write-failed") return t("storage.writeFailed");
    return null;
  }

  const currentStorageError = storageErrorMessage();

  return (
    <main className="app-shell">
      <header className="masthead">
        <button
          aria-label={t("navigation.returnHome")}
          className="brand"
          onClick={() => navigateTo("home")}
          type="button"
        >
          <span aria-hidden="true" className="brand-mark">{t("brand.mark")}</span>
          <span className="brand-copy">
            <strong>{t("brand.name")}</strong>
            <small>{t("brand.subtitle")}</small>
          </span>
        </button>

        <nav aria-label={t("navigation.label")} className="main-nav">
          {(["home", "levels", "game"] as const).map((item) => {
            const current = screen === item || (screen === "replay" && item === "game");
            return (
              <button
                aria-current={current ? "page" : undefined}
                className={current ? "nav-link nav-link--active" : "nav-link"}
                disabled={item === "game" && progressStore === null}
                key={item}
                onClick={() => navigateTo(item)}
                type="button"
              >
                {t(screenTranslationKeys[item])}
              </button>
            );
          })}
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
                onClick={() => changeLocale(option.locale)}
                title={option.label}
                type="button"
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
          <button
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
            aria-label={t("settings.open")}
            className="settings-trigger"
            disabled={progress === null}
            onClick={() => setSettingsOpen(true)}
            title={t("settings.open")}
            type="button"
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </header>

      {currentStorageError && <p className="storage-notice" role="status">{currentStorageError}</p>}
      {levelLoadFailed && <p className="inline-error" role="alert">{t("levels.loadError")}</p>}

      {settingsOpen && progress && (
        <SettingsDialog
          onClose={() => setSettingsOpen(false)}
          onSelectPieceTheme={changePieceTheme}
          pieceTheme={pieceTheme}
        />
      )}

      {screen === "home" && (
        <HomeScreen
          ready={progressStore !== null}
          hasUnfinishedGame={Boolean(progress && Object.keys(progress.gamesByLevel).length > 0)}
          onBrowseLevels={() => setScreen("levels")}
          onContinue={continueGame}
        />
      )}

      {screen === "levels" && progress && (
        <>
          <LevelSelectScreen
            levels={levels}
            onOpenHistory={openHistory}
            onSelectLevel={openLevel}
            onToggleFavorite={(levelId) => progressStore?.toggleFavorite(levelId)}
            progress={progress}
          />
          {selectedHistoryLevel && (
            <CompletionHistoryDialog
              level={selectedHistoryLevel}
              onClose={() => setHistoryLevelId(null)}
              onDelete={(recordId) => progressStore?.deleteCompletionRecord(recordId)}
              onReplay={(record) => startReplay(record, "history")}
              records={selectedHistoryRecords}
            />
          )}
        </>
      )}

      {screen === "game" && activeLevel && gameStore && gameSnapshot && (
        <section aria-labelledby="game-title" className="game-layout">
          <GameHud
            canUndo={gameSnapshot.steps > 0}
            levelId={activeLevel.id}
            levelName={activeLevel.names[activeLocale]}
            locked={gameSnapshot.status === "won"}
            onBackToLevels={() => navigateTo("levels")}
            onRestart={() => {
              const timer = runTimer.current;
              if (timer?.levelId === activeLevel.id) {
                timer.elapsedMs = 0;
                timer.startedAt = document.hidden ? null : performance.now();
              }
              gameStore.restart();
            }}
            onUndo={() => gameStore.undo()}
            steps={gameSnapshot.steps}
          />
          <div className="board-card">
            <div className="board-card-top">
              <span>{t("game.layout")}</span>
              <span className="board-index">{t("game.levelNumber", { number: String(activeLevel.id).padStart(3, "0") })}</span>
            </div>
            <Suspense fallback={<div aria-live="polite" className="phaser-loading">{t("game.loading")}</div>}>
              <PhaserHost
                ariaLabel={t("game.boardLabel")}
                level={activeLevel}
                pieceLabels={pieceLabels}
                pieceTheme={pieceTheme}
                store={gameStore}
              />
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
          {gameSnapshot.status === "won" && winRecord && (
            <WinDialog
              hasNextLevel={nextUnlockedLevel !== null}
              levelName={activeLevel.names[activeLocale]}
              onBackToLevels={() => navigateTo("levels")}
              onNextLevel={() => nextUnlockedLevel && openLevel(nextUnlockedLevel.id)}
              onPlayAgain={playCurrentLevelAgain}
              onReplay={() => startReplay(winRecord, "game")}
              record={winRecord}
              recordSaved={winRecordSaved}
            />
          )}
        </section>
      )}

      {screen === "game" && !activeLevel && (
        <div aria-live="polite" className="phaser-loading">
          {t(levelLoadFailed ? "levels.loadError" : "game.loading")}
        </div>
      )}

      {screen === "replay" && selectedReplay && replayLevel && (
        <ReplayScreen
          level={replayLevel}
          onExit={exitReplay}
          pieceLabels={pieceLabels}
          pieceTheme={pieceTheme}
          record={selectedReplay}
        />
      )}

      <footer className="page-footer">
        <span>{t("footer.tagline")}</span>
        <span>{t("footer.copyright")}</span>
      </footer>
    </main>
  );
}
