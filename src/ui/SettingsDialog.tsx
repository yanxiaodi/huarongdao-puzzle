import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  getPieceArtworkUrl,
  PIECE_THEME_PREVIEW_ARTWORK,
  PIECE_THEMES,
  type ImagePieceTheme,
  type PieceTheme,
} from "../appearance/pieceTheme";
import { useModalFocus } from "./useModalFocus";

type SettingsDialogProps = {
  pieceTheme: PieceTheme;
  onSelectPieceTheme: (theme: PieceTheme) => void;
  onClose: () => void;
};

const PREVIEW_PIECES = [
  { key: "caoCao", className: "piece-theme-sample--cao" },
  { key: "general", className: "piece-theme-sample--general" },
  { key: "soldier", className: "piece-theme-sample--soldier" },
] as const;

const THEME_LABEL_KEYS: Record<PieceTheme, "settings.textPieces" | "settings.warriorPortraits" | "settings.warriorLineArt"> = {
  text: "settings.textPieces",
  portrait: "settings.warriorPortraits",
  "line-art": "settings.warriorLineArt",
};

const SAMPLE_LABEL_KEYS: Record<typeof PREVIEW_PIECES[number]["key"], "settings.sampleCaoCao" | "settings.sampleGeneral" | "settings.sampleSoldier"> = {
  caoCao: "settings.sampleCaoCao",
  general: "settings.sampleGeneral",
  soldier: "settings.sampleSoldier",
};

export function SettingsDialog({ pieceTheme, onSelectPieceTheme, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(backdropRef, dialogRef, onClose);

  return (
    <div
      className="dialog-backdrop settings-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={backdropRef}
    >
      <section
        aria-labelledby="settings-title"
        aria-modal="true"
        className="dialog-card settings-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label={t("common.close")}
          className="dialog-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <p className="eyebrow settings-eyebrow">
          <span aria-hidden="true" className="eyebrow-rule" />
          {t("settings.eyebrow")}
        </p>
        <h2 data-modal-initial-focus id="settings-title" tabIndex={-1}>{t("settings.title")}</h2>
        <p className="settings-description">{t("settings.description")}</p>
        <div aria-label={t("settings.choosePieceTheme")} className="piece-theme-options" role="group">
          {PIECE_THEMES.map((theme) => (
            <button
              aria-pressed={pieceTheme === theme}
              className={pieceTheme === theme ? "piece-theme-option piece-theme-option--selected" : "piece-theme-option"}
              key={theme}
              onClick={() => onSelectPieceTheme(theme)}
              type="button"
            >
              <ThemePreview theme={theme} />
              <span className="piece-theme-option-label">
                {t(THEME_LABEL_KEYS[theme])}
                {pieceTheme === theme && <span aria-hidden="true" className="piece-theme-check">✓</span>}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ThemePreview({ theme }: { theme: PieceTheme }) {
  const { t } = useTranslation();

  return (
    <span aria-hidden="true" className={`piece-theme-preview piece-theme-preview--${theme}`}>
      {PREVIEW_PIECES.map(({ key, className }) => (
        <span className={`piece-theme-sample ${className}`} key={key}>
          {theme === "text" ? (
            t(SAMPLE_LABEL_KEYS[key])
          ) : (
            <img
              alt=""
              src={getPieceArtworkUrl(theme as ImagePieceTheme, PIECE_THEME_PREVIEW_ARTWORK[key])}
            />
          )}
        </span>
      ))}
    </span>
  );
}
