import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { isAppLocale } from "../i18n/types";
import type { Level, PieceRoleId } from "../data/levelSchema";
import type { PieceTheme } from "../appearance/pieceTheme";
import { SolutionPlayback } from "../solutions/SolutionPlayback";
import type { SolutionAccessProvider } from "../solutions/SolutionAccessProvider";
import type { SolutionRepository } from "../solutions/SolutionRepository";
import type { PlaybackSnapshot } from "../solutions/types";
import { SolutionControls } from "./SolutionControls";

const PhaserHost = lazy(() =>
  import("../game/PhaserHost").then(({ PhaserHost: component }) => ({ default: component })),
);

type SolutionScreenProps = {
  level: Level;
  pieceLabels: Record<PieceRoleId, string>;
  pieceTheme: PieceTheme;
  repository: SolutionRepository;
  accessProvider: SolutionAccessProvider;
  onExit: () => void;
};

export function SolutionScreen({
  level,
  pieceLabels,
  pieceTheme,
  repository,
  accessProvider,
  onExit,
}: SolutionScreenProps) {
  const { t } = useTranslation();
  const [playback, setPlayback] = useState<SolutionPlayback | null>(null);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot | null>(null);
  const locale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";

  useEffect(() => {
    let mounted = true;
    const nextPlayback = new SolutionPlayback(level, repository, accessProvider);
    const unsubscribe = nextPlayback.subscribe(() => {
      if (mounted) setSnapshot(nextPlayback.getSnapshot());
    });

    setPlayback(null);
    setSnapshot(null);
    void nextPlayback.initialize().then((initialSnapshot) => {
      if (!mounted) return;
      setPlayback(nextPlayback);
      setSnapshot(initialSnapshot);
    });

    return () => {
      mounted = false;
      unsubscribe();
      nextPlayback.dispose();
    };
  }, [accessProvider, level, repository]);

  function exit(): void {
    playback?.exit();
    onExit();
  }

  const invalidMessage = snapshot?.message === "solution-did-not-win"
    ? t("solution.notWinning")
    : t("solution.invalid", { move: (snapshot?.currentStep ?? 0) + 1 });

  return (
    <section aria-labelledby="solution-title" className="game-layout replay-layout solution-layout">
      <div className="game-heading">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" className="eyebrow-rule" />
            {t("solution.eyebrow", { number: level.id })}
          </p>
          <h1 data-modal-return-focus id="solution-title" tabIndex={-1}>
            {t("solution.title", { name: level.names[locale] })}
          </h1>
        </div>
        <button className="button button--quiet" onClick={exit} type="button">
          {t("solution.exit")}
        </button>
      </div>

      <div className="board-card">
        <div className="board-card-top">
          <span>{t("solution.boardLabel")}</span>
          <span aria-live="polite" className="board-index">
            {t("solution.progress", {
              current: snapshot?.currentStep ?? 0,
              total: snapshot?.totalSteps ?? 0,
            })}
          </span>
        </div>
        <Suspense fallback={<div aria-live="polite" className="phaser-loading">{t("game.loading")}</div>}>
          {!snapshot ? (
            <div aria-live="polite" className="phaser-loading">{t("solution.loading")}</div>
          ) : snapshot.positions && playback ? (
            <PhaserHost
              ariaLabel={t("solution.boardLabel")}
              level={level}
              pieceLabels={pieceLabels}
              pieceTheme={pieceTheme}
              readOnly
              store={playback.getGameStore()}
            />
          ) : (
            <div aria-live="polite" className="phaser-loading solution-unavailable" role="status">
              {t(`solution.status.${snapshot.status}`)}
            </div>
          )}
        </Suspense>
        <div aria-live="polite" className="board-card-bottom replay-status">
          <span>{snapshot ? t(`solution.status.${snapshot.status}`) : t("solution.loading")}</span>
          <span>{t("solution.interval", { seconds: ((snapshot?.intervalMs ?? 1500) / 1000).toFixed(1) })}</span>
        </div>
      </div>

      {snapshot && playback && (
        <SolutionControls
          onFaster={() => playback.faster()}
          onPause={() => playback.pause()}
          onPlay={() => playback.play()}
          onSlower={() => playback.slower()}
          onStepBack={() => playback.stepBack()}
          onStepForward={() => playback.stepForward()}
          snapshot={snapshot}
        />
      )}
      {snapshot?.status === "invalid" && <p aria-live="polite" className="inline-error" role="alert">{invalidMessage}</p>}
    </section>
  );
}
