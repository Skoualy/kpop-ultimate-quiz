import type { SaveOneCriterion } from '@/shared/models'
import type { IdolItem } from '../../SaveOnePage.types'

export interface SaveOneRoundIdolsProps {
  idols: IdolItem[]
  timerSeconds: number
  timerKey: number
  /** Critère actif pour ce round (résolu, jamais 'random') */
  activeCriterion: SaveOneCriterion
  playerName?: string
  onChoose: (idolId: string, timeMs: number) => void
  onPass: (timeMs: number) => void
  onTimeout: () => void
}
