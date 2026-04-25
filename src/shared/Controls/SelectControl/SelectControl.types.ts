export interface SelectOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
}

export interface SelectControlProps<T extends string = string> {
  options: SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  allOptionsLabel?: string // Label de l'option "all" (défaut : "Tous")
  disabled?: boolean
  className?: string
}
