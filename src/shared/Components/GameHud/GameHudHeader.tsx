import styles from './GameHud.module.scss'
import { GameHudHeaderProps } from './GameHud.types'

export function GameHudHeader({
  onBack,
  onPass: onAction,
  actionDisabled = false,
  currentRound,
  totalRounds,
  isFullscreen = false,
  onToggleFullscreen,
}: GameHudHeaderProps) {
  return (
    <>
      {/* ── Gauche : retour config ── */}
      <button type="button" className={styles.navBtn} onClick={onBack}>
        ← Config
      </button>

      {/* ── Centre : badge Round (absolu) ── */}
      <div className={styles.roundBadge}>
        <span className={styles.roundLabel}>Round</span>
        <span className={styles.roundVal}>{currentRound}</span>
        <span className={styles.roundSep}>/</span>
        <span className={styles.roundTotal}>{totalRounds}</span>
      </div>

      {/* ── Droite : Passer + Fullscreen ── */}
      <div className={styles.rightActions}>
        {onAction && (
          <button
            type="button"
            className={[styles.navBtn, styles.passBtn, actionDisabled ? styles.navBtnDisabled : ''].filter(Boolean).join(' ')}
            onClick={onAction}
            disabled={actionDisabled}
          >
            ⏭ Passer
          </button>
        )}
        {onToggleFullscreen && (
          <button
            type="button"
            className={styles.fullscreenBtn}
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {/* ⤢ = expand  |  ⤡ = compress */}
            {isFullscreen ? '⤡' : '⤢'}
          </button>
        )}
      </div>
    </>
  )
}
