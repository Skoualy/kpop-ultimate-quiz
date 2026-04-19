export type PlayerIndex = 0 | 1

export interface GameHeaderProps {
  /** Bouton retour gauche */
  onBack: () => void
  /** Label du bouton retour — défaut : "← Config" */
  backLabel?: string

  /**
   * Bouton d'action secondaire à droite du centre (ex : "⏭ Passer le round").
   * Non rendu si absent.
   */
  onAction?: () => void
  actionLabel?: string
  actionDisabled?: boolean

  /**
   * Mode 2 joueurs : affiche le badge du joueur actif au centre.
   * playerIndex 0 = violet (J1), 1 = rose (J2).
   */
  playerName?: string
  playerIndex?: PlayerIndex
}
