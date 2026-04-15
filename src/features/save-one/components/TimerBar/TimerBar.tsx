import styles from './TimerBar.module.scss'

interface TimerBarProps {
  percentLeft: number    // 0..100
  remainingSeconds: number
  totalSeconds: number
  className?: string
}

export function TimerBar({ percentLeft, remainingSeconds, totalSeconds, className }: TimerBarProps) {
  if (totalSeconds === 0) return null

  const isUrgent = percentLeft <= 30
  const isCritical = percentLeft <= 15

  return (
    <div className={[styles.track, className].filter(Boolean).join(' ')}>
      <div
        className={[
          styles.bar,
          isUrgent ? styles.urgent : '',
          isCritical ? styles.critical : '',
        ].join(' ')}
        style={{ width: `${percentLeft}%` }}
      />
      <span className={styles.label}>{remainingSeconds}s</span>
    </div>
  )
}
