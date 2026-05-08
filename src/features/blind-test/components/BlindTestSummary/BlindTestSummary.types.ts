import type { GameConfig } from '@/shared/models'
import type { BlindTestResult, BlindTestRoundData } from '../../BlindTestPage.types'

export interface BlindTestSummaryProps {
  rounds:         BlindTestRoundData[]
  results:        BlindTestResult[]
  config:         GameConfig
  onRestart:      () => void
  onBackToConfig: () => void
}
