import type { SongItem } from '../../SaveOnePage.types'

export interface SaveOneRoundSongsProps {
  songs: SongItem[]
  clipDuration: number
  timerSeconds: number
  timerKey: number
  /**
   * Player 2 mode: all thumbnails are already revealed, replays are enabled
   * immediately, sequential playback is skipped.
   */
  player2Mode?: boolean
  onChoose: (songId: string, timeMs: number) => void
  onPass: (timeMs: number) => void
  onTimeout: () => void
}
