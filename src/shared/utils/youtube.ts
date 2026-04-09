const YT_EMBED = 'https://www.youtube.com/embed'
const YT_THUMB = 'https://img.youtube.com/vi'

/** Extrait l'ID YouTube depuis une URL watch ou youtu.be */
export function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v')
  } catch {
    return null
  }
}

/** Retourne l'URL d'embed YouTube avec paramètres gameplay */
export function getEmbedUrl(youtubeUrl: string, startSeconds = 0, autoplay = false): string {
  const id = extractYoutubeId(youtubeUrl)
  if (!id) return ''
  const params = new URLSearchParams({
    start: String(startSeconds),
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
  })
  return `${YT_EMBED}/${id}?${params.toString()}`
}

/** Retourne l'URL de la miniature YouTube */
export function getThumbnailUrl(youtubeUrl: string): string {
  const id = extractYoutubeId(youtubeUrl)
  if (!id) return ''
  return `${YT_THUMB}/${id}/hqdefault.jpg`
}
