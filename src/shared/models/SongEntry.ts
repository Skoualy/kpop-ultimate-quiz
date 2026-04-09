import type { LanguageCode } from './enums'

export interface SongEntry {
  id: string
  title: string
  youtubeUrl: string
  language?: LanguageCode
  isDebutSong?: boolean
}
