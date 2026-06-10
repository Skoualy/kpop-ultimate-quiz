import { SaveOneCriterion } from '@/shared/models'

export interface HudOption {
  /** Icône emoji affichée dans le HUD à la place du label texte. Ex: "⏱️" */
  icon?: string
  /** Label texte — utilisé comme tooltip et dans ConfigPage. Ex: "Timer" */
  labelOption?: string
  /** Valeur affichée. Ex: "Personnalisé", "3", "Off" */
  optionValue: string | number
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
  /** Score cumulé du joueur actif — affiché à côté du nom si fourni */
  currentScore?: number
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}
