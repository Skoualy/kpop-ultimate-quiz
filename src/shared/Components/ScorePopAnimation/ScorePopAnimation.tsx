import { useEffect, useState } from 'react'
import styles from './ScorePopAnimation.module.scss'

export interface ScorePopAnimationProps {
  points: number
  onDone: () => void
}

export function ScorePopAnimation({ points, onDone }: ScorePopAnimationProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Matches animation duration in SCSS (800ms total)
    const id = setTimeout(() => {
      setVisible(false)
      onDone()
    }, 800)
    return () => clearTimeout(id)
  }, [onDone])

  if (!visible) return null

  return (
    <div className={styles.overlay} aria-hidden>
      <span className={styles.label}>+{points}</span>
    </div>
  )
}
