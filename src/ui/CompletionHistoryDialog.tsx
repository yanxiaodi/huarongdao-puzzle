import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { isAppLocale } from "../i18n/types";
import type { Level } from "../data/levelSchema";
import type { CompletionRecord } from "../progression/progress";
import { formatElapsedTime } from "./elapsedTime";
import { useModalFocus } from "./useModalFocus";

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
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(backdropRef, dialogRef, onClose);

  return (
    <div className="dialog-backdrop history-backdrop" ref={backdropRef}>
      <section aria-labelledby="history-title" aria-modal="true" className="dialog-card history-dialog" ref={dialogRef} role="dialog" tabIndex={-1}>
        <button aria-label={t("common.close")} className="dialog-close" onClick={onClose} type="button">×</button>
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-rule" />
          {t("history.eyebrow")}
        </p>
        <h2 data-modal-initial-focus id="history-title" tabIndex={-1}>{t("history.title", { number: level.id, name: level.names[locale] })}</h2>
        <p className="history-description">{t("history.description", { count: records.length })}</p>
        <div className="history-list">
          {records.map((record, index) => {
            const completedAt = new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(record.completedAt));
            const elapsed = formatElapsedTime(record.elapsedMs, locale) ?? t("history.elapsedUnknown");
            return (
              <article className="history-record" key={record.id}>
                <div className="history-record-main">
                  <span className="history-rank">#{index + 1}</span>
                  <div>
                    <strong>{t("history.steps", { count: record.steps })}</strong>
                    <span className="history-date">{completedAt} · {t("history.elapsed", { time: elapsed })}</span>
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
          <DeleteConfirmationDialog
            onCancel={() => setPendingDeleteId(null)}
            onConfirm={() => {
              onDelete(pendingDeleteId);
              setPendingDeleteId(null);
            }}
          />
        )}
      </section>
    </div>
  );
}

function DeleteConfirmationDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(backdropRef, dialogRef, onCancel);

  return (
    <div className="dialog-backdrop confirm-backdrop" ref={backdropRef}>
      <section aria-labelledby="delete-history-title" aria-modal="true" className="dialog-card confirm-dialog" ref={dialogRef} role="alertdialog" tabIndex={-1}>
        <h3 data-modal-initial-focus id="delete-history-title" tabIndex={-1}>{t("history.confirmDeleteTitle")}</h3>
        <p>{t("history.confirmDeleteMessage")}</p>
        <div className="dialog-actions">
          <button className="button button--quiet" onClick={onCancel} type="button">
            {t("common.cancel")}
          </button>
          <button className="button button--danger" onClick={onConfirm} type="button">
            {t("history.delete")}
          </button>
        </div>
      </section>
    </div>
  );
}
