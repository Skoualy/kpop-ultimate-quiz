import type { SaveOneCriterion } from '@/shared/models'
import type { QuickVoteLabel } from '@/shared/constants'
import type { IdolItem } from '../../QuickVotePage.types'

export interface QuickVoteRoundIdolsProps {
  /** Toujours 1 item en Quick Vote */
  idol:            IdolItem
  timerSeconds:    number
  timerKey:        number
  activeCriterion: SaveOneCriterion
  /** Labels contextuels : Smash/Pass selon catégorie */
  voteLabel:       QuickVoteLabel
  onVote:          (vote: 'positive' | 'negative', timeMs: number) => void
  onTimeout:       () => void
}
