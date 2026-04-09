import type { LoadingSpinnerProps } from './LoadingSpinner.types'
import styles from './LoadingSpinner.module.scss'

export function LoadingSpinner({ size = 'md', label, fullPage = false }: LoadingSpinnerProps) {
  return (
    <div className={[styles.wrapper, fullPage ? styles.fullPage : ''].filter(Boolean).join(' ')}>
      <div className={[styles.spinner, styles[size]].join(' ')} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  )
}
