import { useEffect, useState } from 'react'
import styles from './PlayerTransitionOverlay.module.scss'

interface PlayerTransitionOverlayProps {
  playerName: string
  onSkip: () => void
}

export function PlayerTransitionOverlay({ playerName, onSkip }: PlayerTransitionOverlayProps) {
  const [countdown, setCountdown] = useState(2)

  // Auto-advance after countdown
  useEffect(() => {
    if (countdown <= 0) {
      onSkip()
      return
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown, onSkip])

  return (
    <div className={styles.overlay} onClick={onSkip} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSkip() }}
    >
      <div className={styles.card}>
        <div className={styles.icon}>🎮</div>
        <p className={styles.turn}>Au tour de</p>
        <p className={styles.name}>{playerName}</p>
        <div className={styles.countdown}>{countdown}</div>
        <p className={styles.hint}>Cliquez n'importe où pour passer</p>
      </div>
    </div>
  )
}
