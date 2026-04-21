import type { ReactNode } from 'react'

export interface LayoutProps {
  children: ReactNode
}

export interface PageContainerProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  wide?: boolean
  className?: string
}
