/**
 * Types propres au mode Quick Vote.
 *
 * Les types de pool partagés (IdolItem, SongItem, RoundData) sont réutilisés
 * directement depuis SaveOnePage.types — ils sont identiques structurellement.
 *
 * TODO refactoring (hors scope) : IdolItem, SongItem, RoundData devraient migrer
 * vers @/shared/models pour supprimer les imports cross-feature.
 */

// ─── Re-exports partagés ──────────────────────────────────────────────────────

export type { PlayerIndex, GamePhase, IdolItem, SongItem, RoundData } from '@/features/save-one/SaveOnePage.types'

// ─── Types propres ────────────────────────────────────────────────────────────

/** Résultat d'un round Quick Vote — stocke le vote générique, pas le wording UI. */
export interface QuickVoteResult {
  roundIndex:  number
  playerIndex: 0 | 1
  /** Vote générique — le wording (Smash/Pass, Top/Flop) est géré uniquement dans l'UI */
  vote:        'positive' | 'negative'
  /** true si le timer a expiré (vote négatif appliqué automatiquement) */
  isTimeout:   boolean
  timeMs:      number | null
}
