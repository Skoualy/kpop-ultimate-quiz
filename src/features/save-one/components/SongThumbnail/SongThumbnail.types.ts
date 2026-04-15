import type { SongItem } from '../../SaveOnePage.types'

export interface SongThumbnailProps {
  song: SongItem
  /** Whether the thumbnail image is visible (false = blurred placeholder) */
  revealed: boolean
  /** Whether the replay button is clickable */
  replayEnabled: boolean
  /** Whether this card is currently playing in the iframe */
  isPlaying?: boolean
  /** Disabled = can't be clicked to choose */
  disabled?: boolean
  onChoose: (songId: string) => void
  onReplay: (song: SongItem) => void
}
