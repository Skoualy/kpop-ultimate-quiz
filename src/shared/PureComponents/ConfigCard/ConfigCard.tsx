import type { ConfigCardProps } from './ConfigCard.types'
import styles from './ConfigCard.module.scss'

export function ConfigCard({ children, className = '' }: ConfigCardProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
