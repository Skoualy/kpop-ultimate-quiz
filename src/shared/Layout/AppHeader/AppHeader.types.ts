import type { ReactNode } from 'react'

export interface AppHeaderProps {
  /**
   * Contenu du slot central.
   * - Pages normales : <PageHeader title="…" /> ou <ConfigHeader />
   * - Pages de jeu   : <GameCenter … />
   */
  centerSlot?: ReactNode
  /**
   * Contenu du slot droit (avant le bouton thème).
   * - Pages normales : boutons de navigation (Configuration, Groupes, Proposer)
   * - Pages de jeu   : null (pas affiché)
   */
  rightSlot?: ReactNode
}

/** Props du slot central pour les pages hors-jeu */
export interface PageHeaderSlotProps {
  /** Nom de la page courante — affiché au centre de la header */
  title: string
}

/** Props du slot central pour les pages de jeu */
export interface GameCenterSlotProps {
  onBack: () => void
  backLabel?: string
  onAction?: () => void
  actionLabel?: string
  actionDisabled?: boolean
  currentRound: number
  totalRounds: number
}
