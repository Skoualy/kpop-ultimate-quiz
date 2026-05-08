import { GameOption } from '@/shared/Components/GameOption'
import type { GameHudProps } from './GameHud.types'
import styles from './GameHud.module.scss'
import { Badge } from '@/shared/PureComponents/Badge'

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
  actionDisabled = false,
  activePlayerName,
  currentRound,
  totalRounds,
  activePlayerIndex,
  currentScore,
  isFullscreen,
  onToggleFullscreen,
}: GameHudProps) {
  const visibleOptions = options.filter(Boolean) as NonNullable<(typeof options)[number]>[]
  const playerClass = activePlayerIndex === 1 ? 'player2' : 'player1'

  return (
    <div className={styles.hud}>
      {/* ── Gauche : retour config ── */}

      <div className={styles.hudCenter}>
        {/* ── Section 1 (DOM) = bas visuel après column-reverse : nav + round ── */}
        <div className={styles.section1}>
          {/* ── Droite : Passer + Fullscreen ── */}
          <div className={styles.leftActions}>
            <button type="button" className={styles.navBtn} onClick={onBack}>
              ← Config
            </button>
            {/* {onToggleFullscreen && (
              <button
                type="button"
                className={styles.fullscreenBtn}
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              >
                {isFullscreen ? '⛶' : '⤢'}
              </button>
            )} */}
          </div>

          {/* ── Centre : badge Round (absolu) ── */}
          <div className={styles.roundBadge}>
            <span className={styles.roundLabel}>Round</span>
            <span className={styles.roundVal}>{currentRound}</span>
            <span className={styles.roundSep}>/</span>
            <span className={styles.roundTotal}>{totalRounds}</span>
          </div>
          <div className={styles.rightActions}>
            {onPass && (
              <button type="button" className={styles.navBtn} onClick={onPass} disabled={actionDisabled}>
                ⏭ Passer
              </button>
            )}
          </div>
        </div>

        {/* ── Section 2 (DOM) = haut visuel après column-reverse : options + joueur ── */}
        <div className={styles.section2}>
          {visibleOptions.map((opt, i) => (
            <span key={i} className={styles.optWrapper}>
              {i > 0 && (
                <span className={styles.sep} aria-hidden>
                  |
                </span>
              )}
              <GameOption icon={opt.icon} labelOption={opt.labelOption} optionValue={opt.optionValue} />
            </span>
          ))}
        </div>
      </div>
      {activePlayerName && (
        <Badge variant={playerClass} className={styles.playerBadge}>
          {activePlayerName}
          {currentScore !== undefined && (
            <span className={styles.scoreChip}> · {currentScore} pt{currentScore !== 1 ? 's' : ''}</span>
          )}
        </Badge>
      )}
      {/* <>
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
      )} */}
    </div>
  )
}
