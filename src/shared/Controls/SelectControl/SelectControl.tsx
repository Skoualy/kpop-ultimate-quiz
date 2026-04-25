import type { SelectControlProps } from './SelectControl.types'
import styles from './SelectControl.module.scss'

/**
 * SelectControl — wrapper générique autour de <select>.
 *
 * Utilise la classe CSS globale "select" du design system pour l'apparence,
 * et expose une API typée pour éviter les casts inline dans les pages.
 *
 * Usage :
 *   <SelectControl<QuizMode>
 *     options={[{ value: 'saveOne', label: 'Save One' }, …]}
 *     value={config.mode}
 *     onChange={(v) => setConfig({ mode: v })}
 *   />
 */
export function SelectControl<T extends string = string>({
  options,
  allOptionsLabel = 'Tous',
  value,
  onChange,
  disabled = false,
  className,
}: SelectControlProps<T>) {
  return (
    <select
      className={`${styles.select} ${className || ''}`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {allOptionsLabel && <option value="all">{allOptionsLabel}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
