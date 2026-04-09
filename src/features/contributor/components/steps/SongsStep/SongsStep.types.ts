import type { LanguageCode } from '@/shared/models'

export interface EditableSong {
  _uiKey: string
  id: string
  title: string
  youtubeUrl: string
  language: LanguageCode | ''
  isDebutSong: boolean
}
