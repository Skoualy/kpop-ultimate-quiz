import type { BadgeProps } from './Badge.types'
import styles from './Badge.module.scss'

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
