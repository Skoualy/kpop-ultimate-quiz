import type { SongItem, IdolItem } from '@/features/save-one/SaveOnePage.types'

export type PlayerIndex = 0 | 1

export type GamePhase =
  | 'loading'
  | 'roundTransition'
  | 'playing'
  | 'playerTransition'
  | 'summary'

export type BlindTestAnswerStatus =
  | 'idle'      // round en cours, aucune réponse
  | 'partial'   // un élément trouvé
  | 'complete'  // artiste + titre trouvés
  | 'revealed'  // révélation manuelle ou automatique
  | 'timeout'   // timer expiré sans réponse complète

export interface BlindTestRoundData {
  roundNumber: number
  /** Chanson J1 (mode songs) */
  song1: SongItem | null
  /** Chanson J2 — null en solo (mode songs) */
  song2: SongItem | null
  /** Idole J1 (mode idols) */
  idol1: IdolItem | null
  /** Idole J2 — null en solo (mode idols) */
  idol2: IdolItem | null
}

export interface BlindTestResult {
  roundIndex:    number
  playerIndex:   PlayerIndex
  artistMatched: boolean
  titleMatched:  boolean
  foundInOneTry: boolean
  timeMs:        number | null
  scoreGained:   number
  isTimeout:     boolean
  isRevealed:    boolean
}

export interface TurnState {
  artistMatched: boolean
  titleMatched:  boolean
  foundInOneTry: boolean
  startTime:     number
  isRevealed:    boolean
  scoreGained:   number
}

export function initialTurnState(): TurnState {
  return {
    artistMatched: false,
    titleMatched:  false,
    foundInOneTry: false,
    startTime:     Date.now(),
    isRevealed:    false,
    scoreGained:   0,
  }
}
