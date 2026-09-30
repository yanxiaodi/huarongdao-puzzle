import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { isAppLocale } from "../i18n/types";
import type { CompletionRecord } from "../progression/progress";

type WinDialogProps = {
  record: CompletionRecord;
  levelName: string;
  hasNextLevel: boolean;
  onReplay: () => void;
  onNextLevel: () => void;
  onBackToLevels: () => void;
};

export function WinDialog({
  record,
  levelName,
  hasNextLevel,
  onReplay,
  onNextLevel,
  onBackToLevels,
}: WinDialogProps) {
  const { t } = useTranslation();
  const locale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";
  const completionTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(record.completedAt));

  return (
    <div className="dialog-backdrop win-backdrop">
      <section aria-labelledby="win-title" aria-modal="true" className="dialog-card win-dialog" role="dialog">
        <p className="eyebrow win-eyebrow">
          <span aria-hidden="true" className="eyebrow-rule" />
          {t("win.eyebrow")}
        </p>
        <h2 id="win-title">{t("win.title")}</h2>
        <p className="win-level-name">{levelName}</p>
        <div aria-label={t("win.starsLabel", { count: record.stars })} className="win-stars">
          {"★".repeat(record.stars)}{"☆".repeat(3 - record.stars)}
        </div>
        <div className="win-stats">
          <div>
            <span>{t("win.steps")}</span>
            <strong>{record.steps}</strong>
          </div>
          <div>
            <span>{t("win.completedAt")}</span>
            <strong>{completionTime}</strong>
          </div>
        </div>
        <p className="win-record-note">{t("win.recordSaved")}</p>
        <div className="dialog-actions">
          <button className="button button--quiet" onClick={onReplay} type="button">
            {t("win.replay")}
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
