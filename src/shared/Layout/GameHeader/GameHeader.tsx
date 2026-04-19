import { useAppContext } from '@/context/AppContext'
import type { GameHeaderProps } from './GameHeader.types'
import styles from './GameHeader.module.scss'

/**
 * Header de navigation générique pour tous les modes de quiz.
 *
 * Layout : 3 colonnes grid
 *   Gauche  — logo K-Pop Ultimate Quiz
 *   Centre  — [← back] [badge joueur actif?] [action button?]
 *   Droite  — toggle thème
 */
export function GameHeader({
  onBack,
  backLabel = '← Config',
  onAction,
  actionLabel = '⏭ Passer le round',
  actionDisabled = false,
  playerName,
  playerIndex = 0,
}: GameHeaderProps) {
  const { theme, setTheme } = useAppContext()

  const playerBadgeClass = playerIndex === 1 ? styles.playerP2 : styles.playerP1

  return (
    <header className={styles.header}>

      {/* Gauche : logo */}
      <div className={styles.left}>
        <span className={styles.logo}>🎵 K-Pop Ultimate Quiz</span>
      </div>

      {/* Centre : boutons nav + badge joueur */}
      <div className={styles.center}>
        <button type="button" className={styles.navBtn} onClick={onBack}>
          {backLabel}
        </button>

        {playerName && (
          <div className={[styles.playerBadge, playerBadgeClass].join(' ')}>
            {playerName}
          </div>
        )}

        {onAction && (
          <button
            type="button"
            className={[styles.navBtn, styles.navBtnAction, actionDisabled ? styles.navBtnDisabled : ''].join(' ')}
            onClick={onAction}
            disabled={actionDisabled}
          >
            {actionLabel}
          </button>
        )}
      </div>

      {/* Droite : thème */}
      <div className={styles.right}>
        <button
          type="button"
          className={styles.themeBtn}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Changer le thème"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

    </header>
  )
}
