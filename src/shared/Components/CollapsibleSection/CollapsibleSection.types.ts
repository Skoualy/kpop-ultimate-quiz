import type { ReactNode } from 'react'

export interface CollapsibleSectionProps {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
  actions?: ReactNode
  className?: string
}
