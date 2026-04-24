import type { SongItem } from '../../../features/save-one/SaveOnePage.types'

export interface SongThumbnailProps {
  song: SongItem
  /** Thumbnail visible (false = placeholder flouté) */
  revealed: boolean
  /** Replay actif (après séquence complète, card non choisie) */
  replayEnabled: boolean
  /** Cette card est en train de jouer dans l'iframe */
  isPlaying?: boolean
  /** La séquence d'extraits est encore en cours (non terminée) */
  isSequencePlaying?: boolean
  /** Disabled = ne peut pas être cliqué pour choisir */
  disabled?: boolean
  onChoose: (songId: string) => void
  onReplay: (song: SongItem) => void
  /**
   * Passer l'extrait en cours — uniquement disponible quand isSequencePlaying && isPlaying.
   * Si absent, le bouton Passer n'est pas rendu.
   */
  onSkip?: () => void
}
