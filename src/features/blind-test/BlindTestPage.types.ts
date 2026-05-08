import type { SongItem } from '@/features/save-one/SaveOnePage.types'

export type PlayerIndex = 0 | 1

export type GamePhase =
  | 'loading'
  | 'roundTransition'
  | 'playing'
  | 'playerTransition'
  | 'summary'

export type BlindTestAnswerStatus =
  | 'idle'      // round en cours
  | 'partial'   // un élément trouvé
  | 'complete'  // artiste + titre trouvés
  | 'revealed'  // révélation manuelle
  | 'timeout'   // timer expiré

export interface BlindTestAnswer {
  playerIndex:    PlayerIndex
  status:         BlindTestAnswerStatus
  artistMatched:  boolean
  titleMatched:   boolean
  /** true si artiste ET titre trouvés en une seule frappe → 3 pts */
  foundInOneTry:  boolean
  /** ms depuis le début du round jusqu'à la complétion, null si non complété */
  timeMs:         number | null
  scoreGained:    number
}

export interface BlindTestRoundData {
  roundNumber: number
  /** Chanson jouée par J1 (ou unique en solo) */
  song1: SongItem
  /** Chanson jouée par J2 — null en solo */
  song2: SongItem | null
}

/** Version plate pour GameSummary (analogue à RoundResult du Save One) */
export interface BlindTestResult {
  roundIndex:     number
  playerIndex:    PlayerIndex
  artistMatched:  boolean
  titleMatched:   boolean
  foundInOneTry:  boolean
  timeMs:         number | null
  scoreGained:    number
  isTimeout:      boolean
  isRevealed:     boolean
}

/** État en cours de la réponse du joueur actif */
export interface TurnState {
  artistMatched: boolean
  titleMatched:  boolean
  foundInOneTry: boolean
  startTime:     number
  isRevealed:    boolean
}

