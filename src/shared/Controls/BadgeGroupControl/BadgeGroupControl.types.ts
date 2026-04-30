export interface BadgeOption<T extends string = string> {
  value:     T
  label:     string
  disabled?: boolean
}

export interface BadgeGroupControlProps<T extends string = string> {
  options:        BadgeOption<T>[]
  /**
   * Valeurs sélectionnées.
   * - Tableau vide [] = "tous sélectionnés" (état par défaut quand allOptionLabel est fourni)
   * - selectedBadges accepté comme alias (rétrocompatibilité)
   */
  value?:         T[]
  selectedBadges?: T[]
  onChange:       (value: T[]) => void

  /**
   * Si fourni, ajoute un badge "Tous" (ou le libellé passé) en première position.
   * Ce badge est sélectionné quand value=[].
   * Quand l'utilisateur clique dessus → onChange([]) est appelé.
   * La valeur ALL_OPTION_VALUE n'est JAMAIS remontée au parent.
   */
  allOptionLabel?: string

  groupLabel?:    string
  hintLabel?:     string
  isMultiselect?: boolean
  required?:      boolean
  disabled?:      boolean
  size?:          'sm' | 'md'
}
