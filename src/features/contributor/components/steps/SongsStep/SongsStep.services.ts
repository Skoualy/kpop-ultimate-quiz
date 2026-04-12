import { slugify } from '@/shared/utils/slug'
import { EditableSong } from './SongsStep.types'
import { LanguageCode } from '@/shared/models/enums'
import { extractYoutubeId } from '@/shared/utils/youtube'

export class SongsStepServices {
  public static emptySong(): EditableSong {
    return {
      _uiKey: Math.random().toString(36).slice(2),
      id: '',
      title: '',
      youtubeUrl: '',
      language: '',
      isDebutSong: false,
    }
  }

  public static slugifySongTitle(title: string): string {
    return slugify(title)
  }

  public static buildSongId(title: string, language: LanguageCode | ''): string {
    const base = SongsStepServices.slugifySongTitle(title.trim())
    if (!base) return ''
    return language ? `${base}-${language}` : base
  }

  public static normalizeSongTitle(value: string): string {
    return value.trim().toLowerCase()
  }

  public static isYoutubeUrlValid(url: string): boolean {
    if (!url.trim()) return false
    return !!extractYoutubeId(url.trim())
  }

  public static validateSongs(titles: EditableSong[], bSides: EditableSong[]): string[] {
    const errors: string[] = []

    const allSongs = [
      ...titles.map((song) => ({ song, bucket: 'title track' as const })),
      ...bSides.map((song) => ({ song, bucket: 'b-side' as const })),
    ]

    const filledTitlesCount = titles.reduce((count, s) => count + (s.title.trim() ? 1 : 0), 0)
    if (filledTitlesCount === 0) {
      errors.push('Au moins un title track est requis')
    }

    const debutSongsCount = titles.reduce((count, s) => count + (s.isDebutSong && s.title.trim() ? 1 : 0), 0)
    if (debutSongsCount > 1) {
      errors.push('Une seule chanson de début est autorisée')
    }

    const seen = new Map<
      string,
      {
        count: number
        buckets: Set<'title track' | 'b-side'>
      }
    >()

    for (const { song, bucket } of allSongs) {
      const title = song.title.trim()
      const url = song.youtubeUrl.trim()

      if (title && !url) {
        errors.push(`"${title}" : URL YouTube manquante`)
      }

      if (!title && url) {
        errors.push(`Une ${bucket} a une URL YouTube sans titre`)
      }

      if (url && !SongsStepServices.isYoutubeUrlValid(url)) {
        errors.push(`"${title || 'Chanson sans titre'}" : URL YouTube invalide`)
      }

      const key = SongsStepServices.buildSongId(song.title, song.language)
      if (!key) continue

      const existing = seen.get(key)
      if (existing) {
        existing.count += 1
        existing.buckets.add(bucket)
      } else {
        seen.set(key, {
          count: 1,
          buckets: new Set([bucket]),
        })
      }
    }

    for (const [key, meta] of seen.entries()) {
      if (meta.count <= 1) continue

      const inTitles = meta.buckets.has('title track')
      const inBSides = meta.buckets.has('b-side')

      if (inTitles && inBSides) {
        errors.push(`Doublon détecté entre titles et b-sides : "${key}"`)
      } else if (inTitles) {
        errors.push(`Doublon détecté dans les title tracks : "${key}"`)
      } else {
        errors.push(`Doublon détecté dans les b-sides : "${key}"`)
      }
    }

    return [...new Set(errors)]
  }
}
