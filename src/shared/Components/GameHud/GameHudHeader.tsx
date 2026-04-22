import styles from './GameHud.module.scss'
import { GameHudHeaderProps } from './GameHud.types'

export function GameHudHeader({
  onBack,
  backLabel = '← Retour config',
  onAction,
  actionLabel = '⏭ Passer round',
  actionDisabled = false,
  currentRound,
  totalRounds,
}: GameHudHeaderProps) {
  return (
    <>
      {/* Extrémité gauche */}
      <button type="button" className={styles.navBtn} onClick={onBack}>
        {backLabel}
      </button>

      {/* Badge Round — milieu absolu */}
      <div className={styles.roundBadge}>
        <span className={styles.roundLabel}>Round</span>
        <span className={styles.roundVal}>{currentRound}</span>
        <span className={styles.roundSep}>/</span>
        <span className={styles.roundTotal}>{totalRounds}</span>
      </div>

      {/* Extrémité droite */}
      {onAction && (
        <button
          type="button"
          className={[styles.navBtn, styles.passBtn, actionDisabled ? styles.navBtnDisabled : ''].join(' ')}
          onClick={onAction}
          disabled={actionDisabled}
        >
          {actionLabel}
        </button>
      )}
    </>
  )
}
