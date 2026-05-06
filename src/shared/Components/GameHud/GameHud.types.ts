import { SaveOneCriterion } from '@/shared/models'

export interface HudOption {
  /** Icône emoji affichée dans le HUD à la place du label texte. Ex: "⏱️" */
  icon?: string
  /** Label texte — utilisé comme tooltip et dans ConfigPage. Ex: "Timer" */
  labelOption?: string
  /** Valeur affichée. Ex: "Personnalisé", "3", "Off" */
  optionValue: string | number
}

export interface GameHudHeaderProps {
  onBack: () => void
  onPass?: () => void
  actionDisabled?: boolean
  currentRound: number
  totalRounds: number
  /** État fullscreen courant — affiche l'icône appropriée sur le bouton */
  isFullscreen?: boolean
  /** Handler toggle fullscreen */
  onToggleFullscreen?: () => void
}

export interface GameHudProps {
  /**
   * Badges de la section options (section2).
   * Les null/undefined sont ignorés.
   */
  options: (HudOption | null | undefined)[]
  onBack: () => void
  onPass?: () => void
  actionDisabled?: boolean
  currentRound: number
  totalRounds: number
  criterion?: SaveOneCriterion | null
  twoPlayer?: boolean
  activePlayerName?: string
  activePlayerIndex?: 0 | 1
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}
