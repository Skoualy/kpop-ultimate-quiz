import type { SongItem } from '@/features/save-one/SaveOnePage.types'
import type { TurnState } from '../../BlindTestPage.types'

export interface BlindTestSongsProps {
  song:        SongItem
  timerSeconds: number
  timerKey:    number
  turnState:   TurnState
  canReplay:   boolean
  canReveal:   boolean
  onSubmit:    (input: string) => 'correct' | 'wrong'
  onReveal:    () => void
  onTimeout:   () => void
  onClipEnd:   () => void
}
