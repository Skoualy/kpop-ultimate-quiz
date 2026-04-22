import { GameConfig } from '@/shared/models'

export interface HudOption {
  /** Label affiché avant la valeur (optionnel). Ex: "Mode de jeu" */
  labelOption?: string
  /** Valeur affichée. Ex: "Personnalisé", "3", "Off" */
  optionValue: string | number
}

export interface GameHudHeaderProps {
  onBack: () => void
  backLabel?: string
  onAction?: () => void
  actionLabel?: string
  actionDisabled?: boolean
  currentRound: number
  totalRounds: number
}

export interface GameHudProps {
  /**
   * Badges de la section principale (ligne 1).
   * Ex : Type de quiz, Catégorie, Mode de jeu, Drops, Timer, Extrait.
   * Les null/undefined sont ignorés.
   */
  options: (HudOption | null | undefined)[]
  onBack: () => void
  backLabel?: string
  onAction?: () => void
  actionLabel?: string
  actionDisabled?: boolean
  currentRound: number
  totalRounds: number

  /**
   * Critère actif — affiché en dernier avec le style badge gradient (mis en valeur).
   * Absent ou null = non affiché.
   */
  criterion?: string | null

  /**
   * Mode 2 joueurs : affiche une section 2 avec le joueur dont c'est le tour.
   */
  twoPlayer?: boolean

  /** Nom du joueur actif (affiché en section 2 si twoPlayer = true) */
  activePlayerName?: string

  /** Index du joueur actif (0 = violet, 1 = rose) */
  activePlayerIndex?: 0 | 1
}
