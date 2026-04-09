import { useMemo } from 'react'
import { BadgeGroupControl } from '@/shared/Controls/BadgeGroupControl'
import type { BadgeOption } from '@/shared/Controls/BadgeGroupControl'
import type { FilterBadgeGroupControlProps } from './FilterBadgeGroupControl.types'

/**
 * FilterBadgeGroupControl — wrapper logique au-dessus de BadgeGroupControl.
 *
 * Gère :
 * - le mode single-select (un seul choix à la fois)
 * - l'option "Tout" (`showAll`) qui sélectionne/désélectionne toutes les options
 *
 * Le rendu est entièrement délégué à BadgeGroupControl.
 */
export function FilterBadgeGroupControl<T extends string = string>({
  options,
  value,
  onChange,
  single = false,
  showAll = false,
  allLabel = 'Tous',
  disabled = false,
  size = 'md',
}: FilterBadgeGroupControlProps<T>) {
  const allValues = useMemo(
    () => options.filter((o) => !o.disabled).map((o) => o.value),
    [options],
  )
  const allSelected = allValues.length > 0 && allValues.every((v) => value.includes(v))

  // Construit les options en ajoutant éventuellement le badge "Tout"
  const resolvedOptions = useMemo<BadgeOption<string>[]>(() => {
    const base = options as BadgeOption<string>[]
    if (!showAll) return base
    return [{ value: '__all__', label: allLabel }, ...base]
  }, [options, showAll, allLabel])

  // Valeur exposée au rendu
  const resolvedValue: string[] = showAll && allSelected ? ['__all__'] : (value as string[])

  function handleChange(vals: string[]) {
    if (disabled) return

    // Bouton "Tout" cliqué
    if (showAll && vals.includes('__all__')) {
      onChange(allSelected ? [] : allValues)
      return
    }

    const cleaned = vals.filter((v) => v !== '__all__') as T[]

    if (single) {
      // Single-select : toujours exactement une valeur, non désélectionnable
      if (cleaned.length > 0) onChange([cleaned[cleaned.length - 1]])
      return
    }

    onChange(cleaned)
  }

  return (
    <BadgeGroupControl<string>
      options={resolvedOptions}
      value={resolvedValue}
      onChange={handleChange}
      isMultiselect={!single}
      disabled={disabled}
      size={size}
    />
  )
}
