import { GameOption } from '@/shared/Components/GameOption'
import type { GameHudProps } from './GameHud.types'
import { GameHudHeader } from './GameHudHeader'
import styles from './GameHud.module.scss'

/**
 * HUD générique pour tous les modes de quiz.
 *
 * Layout (après column-reverse) :
 *   Ligne 1 (visuelle) — section2 : options (icônes + valeurs) | joueur actif
 *   Ligne 2 (visuelle) — section1 : ← Config | Round X/Y | Passer → | ⤢ Fullscreen
 */
export function GameHud({
  options,
  onBack,
  onPass,
  actionDisabled,
  activePlayerName,
  currentRound,
  totalRounds,
  activePlayerIndex,
  isFullscreen,
  onToggleFullscreen,
}: GameHudProps) {
  const visibleOptions = options.filter(Boolean) as NonNullable<(typeof options)[number]>[]
  const playerClass = activePlayerIndex === 1 ? styles.playerP2 : styles.playerP1

  return (
    <div className={styles.hud}>
      {/* ── Section 1 (DOM) = bas visuel après column-reverse : nav + round ── */}
      <div className={styles.section1}>
        <GameHudHeader
          onBack={onBack}
          onPass={onPass}
          actionDisabled={actionDisabled}
          currentRound={currentRound}
          totalRounds={totalRounds}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      </div>

      {/* ── Section 2 (DOM) = haut visuel après column-reverse : options + joueur ── */}
      <div className={styles.section2}>
        {visibleOptions.map((opt, i) => (
          <span key={i} className={styles.optWrapper}>
            {i > 0 && (
              <span className={styles.sep} aria-hidden>|</span>
            )}
            <GameOption
              icon={opt.icon}
              labelOption={opt.labelOption}
              optionValue={opt.optionValue}
            />
          </span>
        ))}
        {activePlayerName && (
          <>
            {visibleOptions.length > 0 && (
              <span className={styles.sep} aria-hidden>|</span>
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
