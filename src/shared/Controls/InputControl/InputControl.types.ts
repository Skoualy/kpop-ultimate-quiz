import type { InputHTMLAttributes } from 'react'

export interface InputControlProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  hint?:      string
  error?:     string
  fullWidth?: boolean
}
