import { forwardRef } from 'react'
import type { InputControlProps } from './InputControl.types'
import styles from './InputControl.module.scss'

export const InputControl = forwardRef<HTMLInputElement, InputControlProps>(
  function InputControl({ label, hint, error, fullWidth = false, id, className = '', ...rest }, ref) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className={[styles.field, fullWidth ? styles.fullWidth : '', className].filter(Boolean).join(' ')}>
        {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={[styles.input, error ? styles.inputError : ''].filter(Boolean).join(' ')}
          {...rest}
        />
        {error  && <span className={styles.error}>{error}</span>}
        {hint && !error && <span className={styles.hint}>{hint}</span>}
      </div>
    )
  },
)
