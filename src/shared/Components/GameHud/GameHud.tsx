import { GameOptionBadge } from '@/shared/Components/GameOptionBadge'
import type { GameHudProps } from './GameHud.types'
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
  twoPlayer = false,
  activePlayerName,
  activePlayerIndex = 0,
}: GameHudProps) {
  const visibleOptions = options.filter(Boolean) as NonNullable<(typeof options)[number]>[]

  const playerClass = activePlayerIndex === 1 ? styles.playerP2 : styles.playerP1

  return (
    <div className={styles.hud}>
      {/* ── Section 1 : badges options + critère ── */}
      <div className={styles.section1}>
        {twoPlayer && activePlayerName && (
          <span className={styles.playerTurn}>
            <span className={[styles.playerName, playerClass].join(' ')}>{activePlayerName}</span>
          </span>
        )}
      </div>

      {/* ── Section 2 : joueur actif (mode 2J uniquement) ── */}

      <div className={styles.section2}>
        {visibleOptions.map((opt, i) => (
          <span key={i} className={styles.optWrapper}>
            {i > 0 && (
              <span className={styles.sep} aria-hidden>
                ·
              </span>
            )}
            <GameOptionBadge labelOption={opt.labelOption} optionValue={opt.optionValue} />
          </span>
        ))}

        {/* Critère — dernier, style badge gradient mis en valeur */}
        {criterion && (
          <>
            {visibleOptions.length > 0 && (
              <span className={styles.sep} aria-hidden>
                ·
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
