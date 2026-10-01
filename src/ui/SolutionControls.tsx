import { useTranslation } from "react-i18next";
import { MIN_PLAYBACK_INTERVAL_MS } from "../game/domain/MovePlayback";
import type { PlaybackSnapshot } from "../solutions/types";

type SolutionControlsProps = {
  snapshot: PlaybackSnapshot;
  onStepBack: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onSlower: () => void;
  onFaster: () => void;
};

export function SolutionControls({
  snapshot,
  onStepBack,
  onPlay,
  onPause,
  onStepForward,
  onSlower,
  onFaster,
}: SolutionControlsProps) {
  const { t } = useTranslation();
  const unavailable = snapshot.status === "locked" || snapshot.status === "unavailable";
  const disabled = unavailable || snapshot.status === "invalid";

  return (
    <div aria-label={t("solution.controlsLabel")} className="replay-controls" role="group">
      <button
        aria-label={t("solution.stepBack")}
        className="button button--quiet"
        disabled={disabled || snapshot.currentStep === 0}
        onClick={onStepBack}
        type="button"
      >
        {t("solution.stepBack")}
      </button>
      {snapshot.status === "playing" ? (
        <button className="button button--primary" disabled={disabled} onClick={onPause} type="button">
          {t("solution.pause")}
        </button>
      ) : (
        <button className="button button--primary" disabled={disabled} onClick={onPlay} type="button">
          {t(snapshot.status === "completed" ? "solution.playAgain" : "solution.play")}
        </button>
      )}
      <button
        aria-label={t("solution.stepForward")}
        className="button button--quiet"
        disabled={disabled || snapshot.currentStep >= snapshot.totalSteps}
        onClick={onStepForward}
        type="button"
      >
        {t("solution.stepForward")}
      </button>
      <span aria-hidden="true" className="replay-control-divider" />
      <button
        aria-label={t("solution.slower")}
        className="button button--quiet"
        disabled={unavailable}
        onClick={onSlower}
        type="button"
      >
        {t("solution.slower")}
      </button>
      <button
        aria-label={t("solution.faster")}
        className="button button--quiet"
        disabled={unavailable || snapshot.intervalMs === MIN_PLAYBACK_INTERVAL_MS}
        onClick={onFaster}
        type="button"
      >
        {t("solution.faster")}
      </button>
    </div>
  );
}
