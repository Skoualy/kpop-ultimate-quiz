import type { CardProps } from './Card.types'
import styles from './Card.module.scss'

export function Card({
  children,
  interactive = false,
  padding = 'md',
  className = '',
  ...rest
}: CardProps) {
  const cls = [
    styles.card,
    styles[padding],
    interactive ? styles.interactive : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  )
}
