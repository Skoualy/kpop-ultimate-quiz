import type { StatusBarProps } from './StatusBar.types'
import styles from './StatusBar.module.scss'

export function StatusBar({ items }: StatusBarProps) {
  return (
    <div className={styles.bar}>
      {items.map((item, i) => (
        <span key={i} className={styles.pill}>
          <span className={styles.label}>{item.label}</span>
          <strong className={styles.value}>{item.value}</strong>
        </span>
      ))}
    </div>
  )
}
