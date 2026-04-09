import type { BadgeGroupControlProps } from './BadgeGroupControl.types'
import styles from './BadgeGroupControl.module.scss'

export function BadgeGroupControl<T extends string = string>({
  options,
  value,
  selectedBadges,
  onChange,
  groupLabel,
  hintLabel,
  isMultiselect = false,
  required = false,
  disabled = false,
  size = 'md',
}: BadgeGroupControlProps<T>) {
  const current = (selectedBadges ?? value ?? []) as T[]
  const sizeCls = size === 'sm' ? styles.sm : styles.md

  function toggle(opt: T) {
    if (disabled) return
    if (!isMultiselect) {
      if (required && current.includes(opt)) return
      onChange(current.includes(opt) ? [] : [opt])
      return
    }
    const next = current.includes(opt)
      ? current.filter((v) => v !== opt)
      : [...current, opt]
    if (required && next.length === 0) return
    onChange(next)
  }

  return (
    <div className={styles.wrapper}>
      {groupLabel && <span className={styles.groupLabel}>{groupLabel}</span>}
      <div className={styles.group}>
        {options.map((opt) => {
          const isSelected     = current.includes(opt.value)
          const isLastRequired = required && isSelected && current.length === 1
          const isDisabled     = disabled || opt.disabled //|| isLastRequired
          return (
            <button
              key={opt.value}
              type="button"
              className={[
                styles.badge, sizeCls,
                isSelected  ? styles.selected  : '',
                isDisabled  ? styles.disabled  : '',
              ].filter(Boolean).join(' ')}
              onClick={() => toggle(opt.value)}
              tabIndex={isDisabled ? -1 : 0}
              title={isLastRequired ? 'Au moins un élément requis' : opt.label}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {hintLabel && <span className={styles.hintLabel}>{hintLabel}</span>}
    </div>
  )
}
