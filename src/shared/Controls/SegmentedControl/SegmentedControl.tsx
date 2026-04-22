/**
 * SegmentedControl — contrôle segmenté générique réutilisable.
 *
 * Utilisé pour :
 *   - Mode de sélection des artistes : Tous / Par filtres / Manuel
 *   - Début de l'extrait (contributor) : Auto / 60s / 90s / 120s
 */
import styles from './SegmentedControl.module.scss'

export interface SegmentedControlOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={[
        styles.root,
        styles[size],
        fullWidth ? styles.fullWidth : '',
      ].filter(Boolean).join(' ')}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={opt.disabled}
          className={[
            styles.btn,
            value === opt.value ? styles.btnActive : '',
            opt.disabled ? styles.btnDisabled : '',
          ].filter(Boolean).join(' ')}
          onClick={() => !opt.disabled && onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
