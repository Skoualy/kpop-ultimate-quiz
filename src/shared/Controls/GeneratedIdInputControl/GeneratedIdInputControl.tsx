import styles from './GeneratedIdInputControl.module.scss'

interface GeneratedIdInputControlProps {
  label?: string
  hint?: string
  value: string
  onChange: (value: string) => void
  generatedId: string
  exists?: boolean
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
}

export function GeneratedIdInputControl({
  label,
  hint,
  value,
  onChange,
  generatedId,
  exists = false,
  placeholder,
  required = false,
  disabled = false,
  error,
}: GeneratedIdInputControlProps) {
  const hasError = !!error || exists

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
          {hint && <span className={styles.hint}>— {hint}</span>}
        </label>
      )}

      <div className={[styles.inputWithSuffix, hasError ? styles.inputError : ''].filter(Boolean).join(' ')}>
        <input
          className={styles.inputMain}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />

        <div className={[styles.inputSuffix, hasError ? styles.inputSuffixError : ''].filter(Boolean).join(' ')}>
          {!generatedId ? 'ID : —' : exists ? `ID : ${generatedId} (⚠ existe déjà)` : `ID : ${generatedId}`}
        </div>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}
    </div>
  )
}
