import type { GameConfig } from '@/shared/models'
import type { RoundData, RoundResult } from '../../SaveOnePage.types'

export interface SaveOneSummaryProps {
  rounds: RoundData[]
  results: RoundResult[]
  config: GameConfig
  onRestart: () => void
  onBackToConfig: () => void
}
