export interface GameHudOption {
  label: string
  value: string | number
}

export interface GameHudProps {
  /** Type de quiz affiché en pill accentuée. Ex : "Save One" */
  quizType: string
  /** Catégorie. Ex : "Idoles", "Chansons" */
  category: string
  /** Mode de jeu. Ex : "Classique", "Personnalisé" */
  gameMode: string
  currentRound: number
  totalRounds: number
  /**
   * Options principales (label + valeur).
   * Le timer doit TOUJOURS être inclus même si désactivé : { label: 'Timer', value: 'Off' }
   * Les entrées null/undefined sont ignorées.
   */
  options: (GameHudOption | null | undefined)[]
  /**
   * Critère actif — affiché avec le style badge gradient (comme CriterionBadge).
   * Ex : "Voix", "Leadership". Absent ou null = non affiché.
   */
  criterion?: string | null
  /**
   * Mode 2 joueurs — affiche un indicateur "👥 2 Joueurs" en section 2.
   */
  twoPlayer?: boolean
}
