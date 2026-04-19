import type { SaveOneCriterion } from '@/shared/models'
import type { IdolItem } from '../../SaveOnePage.types'

export interface SaveOneRoundIdolsProps {
  idols: IdolItem[]
  timerSeconds: number
  timerKey: number
  /** Critère actif du round — transmis à SaveOnePage pour le HUD, non utilisé ici */
  activeCriterion: SaveOneCriterion
  onChoose: (idolId: string, timeMs: number) => void
  onPass: (timeMs: number) => void
  onTimeout: () => void
}
