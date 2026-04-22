import { GameOption } from '@/shared/Components/GameOption'
import type { GameHudProps } from './GameHud.types'
import { GameHudHeader } from './GameHudHeader'
import styles from './GameHud.module.scss'
/**
 * HUD générique pour tous les modes de quiz.
 *
 * Section 1 — ligne de badges séparés par ·, critère en fin mis en valeur.
 * Section 2 — (mode 2J uniquement) joueur dont c'est le tour.
 */
export function GameHud({
  options,
  criterion,
  onBack,
  onAction,
  actionDisabled,
  currentRound,
  totalRounds,
  activePlayerIndex,
}: GameHudProps) {
  const visibleOptions = options.filter(Boolean) as NonNullable<(typeof options)[number]>[]
  const playerClass = activePlayerIndex === 1 ? styles.playerP2 : styles.playerP1

  return (
    <div className={styles.hud}>
      {/* ── Section 1 : badges options + critère ── */}
      <div className={styles.section1}>
        <GameHudHeader
          onBack={onBack}
          onAction={onAction}
          actionLabel="⏭ Passer le round"
          actionDisabled={actionDisabled}
          currentRound={currentRound}
          totalRounds={totalRounds}
        />
      </div>

      {/* ── Section 2 : joueur actif (mode 2J uniquement) ── */}

      <div className={styles.section2}>
        {visibleOptions.map((opt, i) => (
          <span key={i} className={styles.optWrapper}>
            {i > 0 && (
              <span className={styles.sep} aria-hidden>
                |
              </span>
            )}
            <GameOption labelOption={opt.labelOption} optionValue={opt.optionValue} />
          </span>
        ))}

        {/* Critère — dernier, style badge gradient mis en valeur */}
        {criterion && (
          <>
            {visibleOptions.length > 0 && (
              <span className={styles.sep} aria-hidden>
                |
              </span>
            )}
            <span className={styles.criterionBadge}>
              <span className={styles.criterionIcon}>🎯</span>
              <span className={styles.criterionLabel}>Critère</span>
              <span className={styles.criterionValue}>{criterion}</span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}
