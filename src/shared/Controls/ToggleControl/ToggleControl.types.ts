export interface ToggleControlProps {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
  labelPosition?: 'left' | 'right'
  disabled?: boolean
  size?: 'sm' | 'md'
}
