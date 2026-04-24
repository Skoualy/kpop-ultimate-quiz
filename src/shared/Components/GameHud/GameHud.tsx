import { GameOption } from '@/shared/Components/GameOption'
import type { GameHudProps } from './GameHud.types'
import { GameHudHeader } from './GameHudHeader'
import styles from './GameHud.module.scss'
import { CriterionBadge } from '@/features/save-one/components/CriterionBadge'
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
  activePlayerName,
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
          onPass={onAction}
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
        {activePlayerName && (
          <>
            {visibleOptions.length > 0 && (
              <span className={styles.sep} aria-hidden>
                |
              </span>
            )}
            <div className={styles.playerNameRow}>
              <span className={styles.playerLabel}>Joueur</span>
              <span className={[styles.playerName, playerClass].join(' ')}>{activePlayerName}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
