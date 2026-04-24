import styles from './TimerBar.module.scss'

interface TimerBarProps {
  percentLeft: number      // 0..100
  remainingSeconds: number
  totalSeconds: number
  className?: string
}

export function TimerBar({ percentLeft, remainingSeconds, totalSeconds, className }: TimerBarProps) {
  if (totalSeconds === 0) return null

  // Color phase: >60% = green, 30-60% = orange, <30% = red
  const colorClass = percentLeft > 60
    ? styles.colorGreen
    : percentLeft > 30
    ? styles.colorOrange
    : styles.colorRed

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <div className={styles.track}>
        <div
          className={[styles.bar, colorClass].join(' ')}
          style={{ width: `${percentLeft}%` }}
        />
      </div>
      <span className={styles.label}>
        {remainingSeconds}s
      </span>
    </div>
  )
}
