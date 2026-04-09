import type { SelectControlProps } from './SelectControl.types'
import styles from './SelectControl.module.scss'

export function SelectControl<T extends string = string>({
  options, value, onChange, label, hint, error,
  fullWidth = false, id, className = '', ...rest
}: SelectControlProps<T>) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={[styles.field, fullWidth ? styles.fullWidth : '', className].filter(Boolean).join(' ')}>
      {label && <label htmlFor={selectId} className={styles.label}>{label}</label>}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={[styles.select, error ? styles.selectError : ''].filter(Boolean).join(' ')}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error  && <span className={styles.error}>{error}</span>}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
