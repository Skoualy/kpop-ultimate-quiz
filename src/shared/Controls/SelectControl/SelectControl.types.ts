import type { SelectHTMLAttributes } from 'react'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

export interface SelectControlProps<T extends string = string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  options:    SelectOption<T>[]
  value:      T
  onChange:   (value: T) => void
  label?:     string
  hint?:      string
  error?:     string
  fullWidth?: boolean
}
