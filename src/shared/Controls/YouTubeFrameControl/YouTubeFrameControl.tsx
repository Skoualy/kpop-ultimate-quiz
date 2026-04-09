import { getThumbnailUrl, extractYoutubeId } from '@/shared/utils/youtube'
import styles from './YouTubeFrameControl.module.scss'

interface Props {
  youtubeUrl: string
  /** Hauteur du composant — défaut 160px */
  height?: number
}

export function YouTubeFrameControl({ youtubeUrl, height = 160 }: Props) {
  const id       = extractYoutubeId(youtubeUrl)
  const thumbUrl = id ? getThumbnailUrl(youtubeUrl) : ''
  const watchUrl = id ? `https://www.youtube.com/watch?v=${id}` : ''

  if (!id) {
    return (
      <div className={styles.empty} style={{ height }}>
        <span className={styles.emptyIcon}>▶</span>
        <span className={styles.emptyText}>Miniature YouTube</span>
      </div>
    )
  }

  return (
    <a href={watchUrl} target="_blank" rel="noopener noreferrer"
      className={styles.frame} style={{ height }}
      title="Ouvrir dans YouTube">
      <img src={thumbUrl} alt="miniature YouTube" className={styles.thumb} />
      <div className={styles.overlay}>
        <span className={styles.playIcon}>▶</span>
      </div>
    </a>
  )
}
