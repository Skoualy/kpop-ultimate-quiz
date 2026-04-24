import type { GameConfig } from '@/shared/models'
import type { RoundData, QuickVoteResult } from '../../QuickVotePage.types'

export interface QuickVoteSummaryProps {
  rounds:         RoundData[]
  results:        QuickVoteResult[]
  config:         GameConfig
  onRestart:      () => void
  onBackToConfig: () => void
}
