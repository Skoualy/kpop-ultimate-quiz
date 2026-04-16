import type { SaveOneCriterion } from '@/shared/models'
import type { IdolItem, PlayerIndex } from '../../SaveOnePage.types'

export interface SaveOneRoundIdolsProps {
  idols: IdolItem[]
  timerSeconds: number
  timerKey: number
  activeCriterion: SaveOneCriterion
  playerName?: string
  playerIndex?: PlayerIndex
  onChoose: (idolId: string, timeMs: number) => void
  onPass: (timeMs: number) => void
  onTimeout: () => void
}
