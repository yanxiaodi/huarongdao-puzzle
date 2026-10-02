import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { isAppLocale } from "../i18n/types";
import type { Level } from "../data/levelSchema";
import { getDifficultyUnlockStatus } from "../game/domain/scoring";
import type { ProgressSnapshot } from "../progression/progress";

type LevelSelectScreenProps = {
  levels: readonly Level[];
  progress: ProgressSnapshot;
  onSelectLevel: (levelId: number) => void;
  onToggleFavorite: (levelId: number) => void;
  onOpenHistory: (levelId: number) => void;
};

const DIFFICULTIES = [0, 1, 2, 3, 4, 5, 6] as const;

function getFirstUnmetUnlockRequirement(
  levels: readonly Level[],
  completedLevelIds: readonly number[],
  targetDifficulty: number,
) {
  for (let difficulty = 1; difficulty <= targetDifficulty; difficulty += 1) {
    const requirement = getDifficultyUnlockStatus(
      levels,
      completedLevelIds,
      difficulty as Level["difficulty"],
    );
    if (!requirement.isUnlocked) return requirement;
  }
  return null;
}

export function LevelSelectScreen({
  levels,
  progress,
  onSelectLevel,
  onToggleFavorite,
  onOpenHistory,
}: LevelSelectScreenProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<number>(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const locale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "zh-CN";
  const completedLevelIds = useMemo(
    () => Object.keys(progress.bestStars).map(Number),
    [progress.bestStars],
  );
  const unlock = getDifficultyUnlockStatus(levels, completedLevelIds, difficulty as Level["difficulty"]);
  const firstUnmetRequirement = getFirstUnmetUnlockRequirement(levels, completedLevelIds, difficulty);
  const completionCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const record of progress.completionRecords) {
      counts.set(record.levelId, (counts.get(record.levelId) ?? 0) + 1);
    }
    return counts;
  }, [progress.completionRecords]);
  const visibleLevels = levels.filter((level) =>
    level.difficulty === difficulty && (!favoritesOnly || progress.favorites.includes(level.id)),
  );

  return (
    <section aria-labelledby="levels-title" className="content-page level-select-page">
      <div className="page-heading">
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-rule" />
          {t("levels.eyebrow")}
        </p>
        <h1 data-modal-return-focus id="levels-title" tabIndex={-1}>{t("levels.title")}</h1>
        <p className="intro-description">{t("levels.description")}</p>
      </div>

      <div aria-label={t("levels.difficultyLabel")} className="difficulty-tabs" role="group">
        {DIFFICULTIES.map((tier) => {
          const status = getDifficultyUnlockStatus(levels, completedLevelIds, tier);
          const tierCount = levels.filter((level) => level.difficulty === tier).length;
          return (
            <button
              aria-pressed={difficulty === tier}
              className={`difficulty-tab${difficulty === tier ? " difficulty-tab--active" : ""}${status.isUnlocked ? "" : " difficulty-tab--locked"}`}
              key={tier}
              onClick={() => setDifficulty(tier)}
              type="button"
            >
              <span>{t("levels.tier", { number: tier + 1 })}</span>
              <small>{status.isUnlocked ? t("levels.levelCount", { count: tierCount }) : "🔒"}</small>
            </button>
          );
        })}
      </div>

      <div className="level-toolbar">
        {unlock.isUnlocked ? (
          <p className="unlock-message">{t("levels.tierUnlocked")}</p>
        ) : (
          <p className="unlock-message">
            {t("levels.unlockProgress", {
              completed: firstUnmetRequirement?.completedLevels ?? unlock.completedLevels,
              required: firstUnmetRequirement?.requiredLevels ?? unlock.requiredLevels,
              total: firstUnmetRequirement?.totalLevels ?? unlock.totalLevels,
              tier: (firstUnmetRequirement?.prerequisiteDifficulty ?? unlock.prerequisiteDifficulty ?? 0) + 1,
            })}
          </p>
        )}
        <button
          aria-pressed={favoritesOnly}
          className={favoritesOnly ? "filter-button filter-button--active" : "filter-button"}
          onClick={() => setFavoritesOnly((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">★</span>
          {t(favoritesOnly ? "levels.showAll" : "levels.showFavorites")}
        </button>
      </div>

      <div aria-live="polite" className="level-grid">
        {visibleLevels.map((level) => {
          const status = getDifficultyUnlockStatus(levels, completedLevelIds, level.difficulty);
          const locked = !status.isUnlocked;
          const stars = progress.bestStars[String(level.id)] ?? 0;
          const save = progress.gamesByLevel[String(level.id)];
          const historyCount = completionCounts.get(level.id) ?? 0;
          return (
            <article className={`level-card${locked ? " level-card--locked" : ""}`} key={level.id}>
              <button
                aria-label={t(locked ? "levels.lockedLevelLabel" : "levels.openLevelLabel", {
                  number: level.id,
                  name: level.names[locale],
                })}
                className="level-open-button"
                disabled={locked}
                onClick={() => onSelectLevel(level.id)}
                type="button"
              >
                <span className="level-card-meta">
                  <span className="level-card-number">{t("levels.levelNumber", { number: level.id })}</span>
                  {save && <span className="level-save-badge">{t("levels.continueBadge")}</span>}
                  {locked && <span className="level-lock-badge" aria-hidden="true">◆</span>}
                </span>
                <strong className="level-card-name">{level.names[locale]}</strong>
                <span aria-label={t("levels.bestStars", { count: stars })} className="level-stars">
                  {Array.from({ length: 3 }, (_, index) => index < stars ? "★" : "☆").join("")}
                </span>
                <LevelMiniBoard level={level} />
              </button>
              <div className="level-card-actions">
                <button
                  aria-label={t(progress.favorites.includes(level.id) ? "levels.removeFavorite" : "levels.addFavorite", { name: level.names[locale] })}
                  aria-pressed={progress.favorites.includes(level.id)}
                  className={progress.favorites.includes(level.id) ? "icon-button icon-button--favorite" : "icon-button"}
                  onClick={() => onToggleFavorite(level.id)}
                  type="button"
                >
                  {progress.favorites.includes(level.id) ? "★" : "☆"}
                </button>
                <button
                  aria-label={t("levels.historyButton", { count: historyCount, name: level.names[locale] })}
                  className="history-button"
                  disabled={historyCount === 0}
                  onClick={() => onOpenHistory(level.id)}
                  type="button"
                >
                  {t("levels.historyShort", { count: historyCount })}
                </button>
              </div>
            </article>
          );
        })}
        {visibleLevels.length === 0 && (
          <p className="empty-state">{t(favoritesOnly ? "levels.noFavorites" : "levels.noLevels")}</p>
        )}
      </div>
    </section>
  );
}

function LevelMiniBoard({ level }: { level: Level }) {
  return (
    <span aria-hidden="true" className="level-mini-board">
      {level.pieces.map((piece) => {
        const roleClass = piece.id === level.targetPieceId
          ? "target"
          : piece.roleId.startsWith("general-")
            ? "general"
            : "soldier";
        return (
          <span
            className={`level-mini-piece level-mini-piece--${roleClass}`}
            key={piece.id}
            style={{
              gridColumn: `${piece.x + 1} / span ${piece.width}`,
              gridRow: `${piece.y + 1} / span ${piece.height}`,
            }}
          />
        );
      })}
    </span>
  );
}
