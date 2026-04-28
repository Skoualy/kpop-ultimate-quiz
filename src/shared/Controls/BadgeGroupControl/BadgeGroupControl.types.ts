export interface BadgeOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
}

export interface BadgeGroupControlProps<T extends string = string> {
  options: BadgeOption<T>[]
  /** Valeurs sélectionnées — alias selectedBadges accepté aussi */
  value?: T[]
  selectedBadges?: T[]
  onChange: (value: T[]) => void
  groupLabel?: string
  allOptionLabel?: string
  hintLabel?: string
  isMultiselect?: boolean
  required?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}
