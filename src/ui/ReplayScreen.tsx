import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { isAppLocale } from "../i18n/types";
import type { Level } from "../data/levelSchema";
import type { PieceRoleId } from "../data/levelSchema";
import { MovePlayback, type MovePlaybackSnapshot } from "../game/domain/MovePlayback";
import type { CompletionRecord } from "../progression/progress";
import type { PieceTheme } from "../appearance/pieceTheme";
import { formatElapsedTime } from "./elapsedTime";

const PhaserHost = lazy(() =>
  import("../game/PhaserHost").then(({ PhaserHost: component }) => ({ default: component })),
);

type ReplayScreenProps = {
  level: Level;
  record: CompletionRecord;
  pieceLabels: Record<PieceRoleId, string>;
  pieceTheme: PieceTheme;
  onExit: () => void;
};

export function ReplayScreen({ level, record, pieceLabels, pieceTheme, onExit }: ReplayScreenProps) {
  const { t } = useTranslation();
  const [playback, setPlayback] = useState<MovePlayback | null>(null);
  const [snapshot, setSnapshot] = useState<MovePlaybackSnapshot | null>(null);
  const locale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";
  const time = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(record.completedAt));
  const elapsed = formatElapsedTime(record.elapsedMs, locale) ?? t("history.elapsedUnknown");

  useEffect(() => {
    const nextPlayback = new MovePlayback(level, record.moves);
    setPlayback(nextPlayback);
    setSnapshot(nextPlayback.getSnapshot());
    const unsubscribe = nextPlayback.subscribe(() => setSnapshot(nextPlayback.getSnapshot()));
    return () => {
      unsubscribe();
      nextPlayback.dispose();
    };
  }, [level, record]);

  return (
    <section aria-labelledby="replay-title" className="game-layout replay-layout">
      <div className="game-heading">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" className="eyebrow-rule" />
            {t("replay.eyebrow", { number: level.id })}
          </p>
          <h1 data-modal-return-focus id="replay-title" tabIndex={-1}>{t("replay.title", { name: level.names[locale] })}</h1>
          <p className="replay-meta">{t("replay.recordSummary", { steps: record.steps, time, elapsed })}</p>
        </div>
        <button className="button button--quiet" onClick={onExit} type="button">
          {t("replay.exit")}
        </button>
      </div>

      <div className="board-card">
        <div className="board-card-top">
          <span>{t("replay.boardLabel")}</span>
          <span className="board-index" aria-live="polite">
            {t("replay.progress", {
              current: snapshot?.currentStep ?? 0,
              total: record.moves.length,
            })}
          </span>
        </div>
        <Suspense fallback={<div aria-live="polite" className="phaser-loading">{t("game.loading")}</div>}>
          {playback ? (
            <PhaserHost
              ariaLabel={t("game.boardLabel")}
              level={level}
              pieceLabels={pieceLabels}
              pieceTheme={pieceTheme}
              readOnly
              store={playback.getGameStore()}
            />
          ) : (
            <div aria-live="polite" className="phaser-loading">{t("game.loading")}</div>
          )}
        </Suspense>
        <div className="board-card-bottom replay-status" aria-live="polite">
          <span>{t(`replay.status.${snapshot?.status ?? "paused"}`)}</span>
          <span>{t("replay.interval", { seconds: ((snapshot?.intervalMs ?? 1500) / 1000).toFixed(1) })}</span>
        </div>
      </div>

      <div aria-label={t("replay.controlsLabel")} className="replay-controls" role="group">
        <button
          aria-label={t("replay.stepBack")}
          className="button button--quiet"
          disabled={!snapshot || snapshot.currentStep === 0 || snapshot.status === "invalid"}
          onClick={() => playback?.stepBack()}
          type="button"
        >
          {t("replay.stepBack")}
        </button>
        {snapshot?.status === "playing" ? (
          <button className="button button--primary" onClick={() => playback?.pause()} type="button">
            {t("replay.pause")}
          </button>
        ) : (
          <button className="button button--primary" onClick={() => playback?.play()} type="button">
            {t(snapshot?.status === "completed" ? "replay.playAgain" : "replay.play")}
          </button>
        )}
        <button
          aria-label={t("replay.stepForward")}
          className="button button--quiet"
          disabled={!snapshot || snapshot.currentStep >= snapshot.totalSteps || snapshot.status === "invalid"}
          onClick={() => playback?.stepForward()}
          type="button"
        >
          {t("replay.stepForward")}
        </button>
        <span className="replay-control-divider" />
        <button
          aria-label={t("replay.slower")}
          className="button button--quiet"
          onClick={() => playback?.slower()}
          type="button"
        >
          {t("replay.slower")}
        </button>
        <button
          aria-label={t("replay.faster")}
          className="button button--quiet"
          disabled={snapshot?.intervalMs === 200}
          onClick={() => playback?.faster()}
          type="button"
        >
          {t("replay.faster")}
        </button>
      </div>
      {snapshot?.status === "invalid" && <p className="inline-error">{t("replay.invalid")}</p>}
    </section>
  );
}
