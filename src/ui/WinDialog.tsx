import { useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { isAppLocale } from "../i18n/types";
import type { Level } from "../data/levelSchema";
import type { CompletionRecord } from "../progression/progress";
import { formatElapsedTime } from "./elapsedTime";
import { useModalFocus } from "./useModalFocus";

type WinDialogProps = {
  record: CompletionRecord;
  recordSaved: boolean;
  levelName: string;
  hasNextLevel: boolean;
  newlyUnlockedDifficulty: Level["difficulty"] | null;
  onReplay: () => void;
  onPlayAgain: () => void;
  onNextLevel: () => void;
  onBackToLevels: () => void;
};

export function WinDialog({
  record,
  recordSaved,
  levelName,
  hasNextLevel,
  newlyUnlockedDifficulty,
  onReplay,
  onPlayAgain,
  onNextLevel,
  onBackToLevels,
}: WinDialogProps) {
  const { t } = useTranslation();
  const locale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(backdropRef, dialogRef);
  const elapsed = formatElapsedTime(record.elapsedMs, locale) ?? t("history.elapsedUnknown");
  const completionTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(record.completedAt));

  return (
    <div className="dialog-backdrop win-backdrop" ref={backdropRef}>
      <section aria-labelledby="win-title" aria-modal="true" className="dialog-card win-dialog" ref={dialogRef} role="dialog" tabIndex={-1}>
        <p className="eyebrow win-eyebrow">
          <span aria-hidden="true" className="eyebrow-rule" />
          {t("win.eyebrow")}
        </p>
        <h2 data-modal-initial-focus id="win-title" tabIndex={-1}>{t("win.title")}</h2>
        <p className="win-level-name">{levelName}</p>
        <div aria-label={t("win.starsLabel", { count: record.stars })} className="win-stars">
          {"★".repeat(record.stars)}{"☆".repeat(3 - record.stars)}
        </div>
        {newlyUnlockedDifficulty !== null && (
          <div aria-live="polite" className="win-tier-unlock" role="status">
            <span aria-hidden="true" className="win-tier-unlock-seal">✦</span>
            <div>
              <strong>{t("win.tierUnlocked", { number: newlyUnlockedDifficulty + 1 })}</strong>
              <p>{t("win.tierUnlockedDescription")}</p>
            </div>
          </div>
        )}
        <div className="win-stats">
          <div>
            <span>{t("win.steps")}</span>
            <strong>{record.steps}</strong>
          </div>
          <div>
            <span>{t("win.elapsed")}</span>
            <strong>{elapsed}</strong>
          </div>
          <div>
            <span>{t("win.completedAt")}</span>
            <strong>{completionTime}</strong>
          </div>
        </div>
        <p aria-live="polite" className={recordSaved ? "win-record-note" : "win-record-note win-record-note--warning"} role={recordSaved ? undefined : "alert"}>
          {t(recordSaved ? "win.recordSaved" : "win.recordNotSaved")}
        </p>
        <div className="dialog-actions">
          <button className="button button--quiet" onClick={onReplay} type="button">
            {t("win.replay")}
          </button>
          <button className="button button--quiet" onClick={onPlayAgain} type="button">
            {t("win.playAgain")}
          </button>
          {hasNextLevel ? (
            <button className="button button--primary" onClick={onNextLevel} type="button">
              {t("win.nextLevel")} <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <button className="button button--primary" onClick={onBackToLevels} type="button">
              {t("win.backToLevels")} <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
