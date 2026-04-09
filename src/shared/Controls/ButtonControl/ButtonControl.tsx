import type { ButtonControlProps } from './ButtonControl.types'
import styles from './ButtonControl.module.scss'

export function ButtonControl({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonControlProps) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className={styles.spinner} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
