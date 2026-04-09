export interface FilterBadgeOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
}

export interface FilterBadgeGroupControlProps<T extends string = string> {
  options: FilterBadgeOption<T>[]
  /** Multi-select : tableau de valeurs sélectionnées */
  value: T[]
  onChange: (value: T[]) => void
  /** Si true, un seul choix à la fois (radio-like) */
  single?: boolean
  /** Afficher un bouton "Tout" qui sélectionne tout / désélectionne tout */
  showAll?: boolean
  allLabel?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}
