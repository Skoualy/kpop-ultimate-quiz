import type { PlayerIndex, SongItem } from '../../SaveOnePage.types'

export interface SaveOneRoundSongsProps {
  songs: SongItem[]
  clipDuration: number
  timerSeconds: number
  timerKey: number
  player2Mode?: boolean
  playerName?: string
  playerIndex?: PlayerIndex
  onChoose: (songId: string, timeMs: number) => void
  //onPass: (timeMs: number) => void
  onTimeout: () => void
}
