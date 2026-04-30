import { ALL_OPTION_VALUE } from '@/shared/constants/common'
import type { BadgeGroupControlProps, BadgeOption } from './BadgeGroupControl.types'
import styles from './BadgeGroupControl.module.scss'

/**
 * BadgeGroupControl — groupe de badges cliquables (single ou multi-select).
 *
 * Comportement allOptionLabel :
 *   - Si la prop est fournie, un badge "Tous" (ou le libellé donné) est injecté en premier.
 *   - value=[] ↔ badge "Tous" visuellement sélectionné (état par défaut).
 *   - Clic sur "Tous" → onChange([]).
 *   - Clic sur un badge individuel quand "Tous" est actif → sélectionne uniquement ce badge.
 *   - La valeur ALL_OPTION_VALUE n'est JAMAIS remontée au parent via onChange.
 *
 * Remplace FilterBadgeGroupControl (supprimé) : passer allOptionLabel au lieu d'utiliser
 * le wrapper.
 */
export function BadgeGroupControl<T extends string = string>({
  options,
  value,
  selectedBadges,
  onChange,
  groupLabel,
  allOptionLabel,
  hintLabel,
  isMultiselect = false,
  required      = false,
  disabled      = false,
  size          = 'md',
}: BadgeGroupControlProps<T>) {
  const current  = (selectedBadges ?? value ?? []) as T[]
  const sizeCls  = size === 'sm' ? styles.sm : styles.md
  const hasAll   = !!allOptionLabel
  // "Tous" est actif quand aucun badge individuel n'est sélectionné
  const allActive = hasAll && current.length === 0

  function toggle(opt: string) {
    if (disabled) return

    // ── Clic sur le badge "Tous" ──────────────────────────────────────────────
    if (hasAll && opt === ALL_OPTION_VALUE) {
      if (!allActive) onChange([]) // Réinitialise seulement si ce n'est pas déjà actif
      return
    }

    const optTyped = opt as T

    if (!isMultiselect) {
      // Single-select : déselectionner → [] (= tous), sélectionner → [opt]
      onChange(current.includes(optTyped) ? [] : [optTyped])
      return
    }

    // Multi-select : toggle l'option individuelle
    const next = current.includes(optTyped)
      ? current.filter((v) => v !== optTyped)
      : [...current, optTyped]

    // Dernier badge désélectionné en mode required → on n'autorise pas (au moins 1)
    if (required && next.length === 0 && !hasAll) return

    onChange(next)
  }

  // Construction du tableau d'options avec injection du badge "Tous" si besoin
  const allOptions: BadgeOption<string>[] = hasAll
    ? [{ value: ALL_OPTION_VALUE, label: allOptionLabel! }, ...(options as BadgeOption<string>[])]
    : (options as BadgeOption<string>[])

  return (
    <div className={styles.wrapper}>
      {groupLabel && <span className={styles.groupLabel}>{groupLabel}</span>}
      <div className={styles.group}>
        {allOptions.map((opt) => {
          const isAllOpt   = hasAll && opt.value === ALL_OPTION_VALUE
          const isSelected = isAllOpt ? allActive : current.includes(opt.value as T)
          const isDisabled = disabled || opt.disabled
          return (
            <button
              key={opt.value}
              type="button"
              className={[
                styles.badge,
                sizeCls,
                isSelected ? styles.selected  : '',
                isDisabled ? styles.disabled  : '',
              ].filter(Boolean).join(' ')}
              onClick={() => toggle(opt.value)}
              tabIndex={isDisabled ? -1 : 0}
              title={opt.label}
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
