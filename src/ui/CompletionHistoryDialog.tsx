import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { isAppLocale } from "../i18n/types";
import type { Level } from "../data/levelSchema";
import type { CompletionRecord } from "../progression/progress";

type CompletionHistoryDialogProps = {
  level: Level;
  records: readonly CompletionRecord[];
  onReplay: (record: CompletionRecord) => void;
  onDelete: (recordId: string) => void;
  onClose: () => void;
};

export function CompletionHistoryDialog({
  level,
  records,
  onReplay,
  onDelete,
  onClose,
}: CompletionHistoryDialogProps) {
  const { t } = useTranslation();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const locale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";

  return (
    <div className="dialog-backdrop history-backdrop">
      <section aria-labelledby="history-title" aria-modal="true" className="dialog-card history-dialog" role="dialog">
        <button aria-label={t("common.close")} className="dialog-close" onClick={onClose} type="button">×</button>
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-rule" />
          {t("history.eyebrow")}
        </p>
        <h2 id="history-title">{t("history.title", { number: level.id, name: level.names[locale] })}</h2>
        <p className="history-description">{t("history.description", { count: records.length })}</p>
        <div className="history-list">
          {records.map((record, index) => {
            const completedAt = new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(record.completedAt));
            return (
              <article className="history-record" key={record.id}>
                <div className="history-record-main">
                  <span className="history-rank">#{index + 1}</span>
                  <div>
                    <strong>{t("history.steps", { count: record.steps })}</strong>
                    <span className="history-date">{completedAt}</span>
                  </div>
                </div>
                <div aria-label={t("history.stars", { count: record.stars })} className="history-stars">
                  {"★".repeat(record.stars)}{"☆".repeat(3 - record.stars)}
                </div>
                <div className="history-record-actions">
                  <button className="button button--quiet" onClick={() => onReplay(record)} type="button">
                    {t("history.replay")}
                  </button>
                  <button
                    aria-label={t("history.deleteRecord", { count: record.steps, date: completedAt })}
                    className="icon-button history-delete"
                    onClick={() => setPendingDeleteId(record.id)}
                    type="button"
                  >
                    {t("history.delete")}
                  </button>
                </div>
              </article>
            );
          })}
          {records.length === 0 && <p className="empty-state">{t("history.empty")}</p>}
        </div>
        {pendingDeleteId && (
          <div className="dialog-backdrop confirm-backdrop">
            <section aria-labelledby="delete-history-title" aria-modal="true" className="dialog-card confirm-dialog" role="alertdialog">
              <h3 id="delete-history-title">{t("history.confirmDeleteTitle")}</h3>
              <p>{t("history.confirmDeleteMessage")}</p>
              <div className="dialog-actions">
                <button className="button button--quiet" onClick={() => setPendingDeleteId(null)} type="button">
                  {t("common.cancel")}
                </button>
                <button
                  className="button button--danger"
                  onClick={() => {
                    onDelete(pendingDeleteId);
                    setPendingDeleteId(null);
                  }}
                  type="button"
                >
                  {t("history.delete")}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
