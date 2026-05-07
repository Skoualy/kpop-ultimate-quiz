import { useEffect, useRef } from 'react'
import { YouTubePlayer } from '@/shared/Components/YouTubePlayer'
import type { YouTubePlayerHandle } from '@/shared/Components/YouTubePlayer'
import type { SongItem } from '@/features/save-one/SaveOnePage.types'
import styles from './SpinningDisc.module.scss'

export interface SpinningDiscProps {
  song:        SongItem
  isRevealed:  boolean
  /** Afficher le bouton Rejouer sur le disque (false en mode Hardcore) */
  canReplay:   boolean
  timerKey:    number
  onClipEnd?:  () => void
  onClipStart?: () => void
}

/**
 * Bloc média central du Blind Test.
 * - Avant révélation : disque animé + YouTube en fond (audio seul).
 * - Après révélation  : iframe YouTube visible (16:9, max-width 720px).
 *
 * Hauteur constante 405px dans les deux états pour éviter les sauts de layout.
 */
export function SpinningDisc({
  song,
  isRevealed,
  canReplay,
  timerKey,
  onClipEnd,
  onClipStart,
}: SpinningDiscProps) {
  const playerRef = useRef<YouTubePlayerHandle>(null)

  // Rejoue le clip depuis le début à chaque révélation
  // (le clip peut avoir expiré pendant la phase aveugle)
  useEffect(() => {
    if (isRevealed) playerRef.current?.replay()
  }, [isRevealed])

  function handleReplay() {
    playerRef.current?.replay()
  }

  return (
    <div className={styles.root}>
      {/* YouTube — toujours rendu pour l'audio ; visible seulement après révélation */}
      <div className={isRevealed ? styles.iframeVisible : styles.iframeHidden}>
        <YouTubePlayer
          ref={playerRef}
          key={`yt-${timerKey}-${song.songId}`}
          videoId={song.youtubeId}
          startTime={song.startTime}
          endTime={song.endTime}
          onPlay={onClipStart}
          onClipEnd={onClipEnd}
          className={styles.player}
        />
      </div>

      {/* Disque animé — visible uniquement avant révélation */}
      {!isRevealed && (
        <div className={styles.discArea}>
          <div className={styles.disc}>
            {/* Rainures concentriques */}
            <div className={styles.groove1} />
            <div className={styles.groove2} />
            <div className={styles.centerHole} />
          </div>
          {canReplay && (
            <button
              type="button"
              className={styles.replayBtn}
              onClick={handleReplay}
              title="Rejouer l'extrait"
              aria-label="Rejouer l'extrait"
            >
              ▶
            </button>
          )}
        </div>
      )}
    </div>
  )
}
