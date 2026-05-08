import type { IdolItem } from '@/features/save-one/SaveOnePage.types'
import type { TurnState } from '../../BlindTestPage.types'

export interface BlindTestIdolsProps {
  idol:         IdolItem
  timerSeconds: number
  timerKey:     number
  turnState:    TurnState
  canReveal:    boolean
  onSubmit:     (input: string) => 'correct' | 'wrong'
  onReveal:     () => void
  onTimeout:    () => void
}
