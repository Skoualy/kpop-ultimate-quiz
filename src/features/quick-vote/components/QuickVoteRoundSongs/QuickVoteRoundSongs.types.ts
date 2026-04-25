import type { QuickVoteLabel } from '@/shared/constants'
import type { SongItem } from '../../QuickVotePage.types'

export interface QuickVoteRoundSongsProps {
  /** Toujours 1 chanson en Smash or Pass */
  song: SongItem
  clipDuration: number
  timerSeconds: number
  timerKey: number
  /** Labels contextuels : Top/Flop selon catégorie */
  voteLabel: QuickVoteLabel
  onVote: (vote: 'positive' | 'negative', timeMs: number) => void
  onTimeout: () => void
}
