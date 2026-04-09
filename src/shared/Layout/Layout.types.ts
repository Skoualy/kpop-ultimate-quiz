import type { ReactNode } from 'react'

export interface LayoutProps {
  children: ReactNode
}

export interface PageContainerProps {
  children:   ReactNode
  title?:     string
  subtitle?:  string
  actions?:   ReactNode
  wide?:      boolean   // max-width: 100% (pour les pages jeu plein écran)
  className?: string
}
