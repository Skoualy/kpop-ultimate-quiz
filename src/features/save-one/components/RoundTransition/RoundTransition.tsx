import { useEffect } from 'react'
import styles from './RoundTransition.module.scss'

interface RoundTransitionProps {
  roundNumber: number
  totalRounds: number
  onDone: () => void
}

/**
 * Brief animated transition shown between rounds.
 * Auto-dismisses after ~700ms.
 */
export function RoundTransition({ roundNumber, totalRounds, onDone }: RoundTransitionProps) {
  useEffect(() => {
    const id = setTimeout(onDone, 750)
    return () => clearTimeout(id)
  }, [onDone])

  return (
    <div className={styles.overlay}>
      <div className={styles.pill}>
        <span className={styles.label}>Round</span>
        <span className={styles.number}>{roundNumber}</span>
        <span className={styles.total}>/ {totalRounds}</span>
      </div>
    </div>
  )
}
