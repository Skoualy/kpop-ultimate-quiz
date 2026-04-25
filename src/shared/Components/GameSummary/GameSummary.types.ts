import type { ReactNode } from 'react'

// ─── Round générique ──────────────────────────────────────────────────────────

/**
 * Données d'un round prêtes à être rendues par GameSummary.
 * Chaque jeu pré-calcule ses SummaryRound[] et passe le ReactNode correspondant.
 */
export interface SummaryRound {
  roundNumber: number
  /** Badge optionnel affiché à côté du numéro de round (ex: "★ Même choix !") */
  matchLabel?:  string
  /** Contenu rendu côté J1 (ou unique en solo) */
  p1Content:    ReactNode
  /** Contenu rendu côté J2 (absent en mode solo) */
  p2Content?:   ReactNode
}

// ─── Props GameSummary ────────────────────────────────────────────────────────

export interface GameSummaryProps {
  /** Titre de la page résumé (ex: "Résumé de partie") */
  title:          string
  /** Sous-titre descriptif (ex: "5 rounds · Save One · Idoles") */
  subtitle:       string
  onRestart:      () => void
  onBackToConfig: () => void
  twoPlayer:      boolean
  p1Name:         string
  p2Name:         string
  /**
   * Nombre de choix identiques entre J1 et J2.
   * Affiché en bandeau doré si > 0, ignoré si undefined ou 0.
   */
  commonChoicesCount?: number
  /**
   * Label personnalisé pour le bandeau de choix communs.
   * @default "choix en commun"
   */
  commonChoicesLabel?: string
  /** Stats de J1 rendues dans la colonne gauche de la stats card */
  p1Stats:        ReactNode
  /** Stats de J2 rendues dans la colonne droite (2J seulement) */
  p2Stats?:       ReactNode
  /** Rounds prêts à l'affichage */
  summaryRounds:  SummaryRound[]
}
