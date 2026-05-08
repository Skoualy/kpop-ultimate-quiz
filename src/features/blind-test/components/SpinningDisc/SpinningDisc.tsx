import { useEffect, useRef } from 'react'
import { YouTubePlayer } from '@/shared/Components/YouTubePlayer'
import type { YouTubePlayerHandle } from '@/shared/Components/YouTubePlayer'
import type { SongItem } from '@/features/save-one/SaveOnePage.types'
import styles from './SpinningDisc.module.scss'

export interface SpinningDiscProps {
  song:        SongItem
  isRevealed:  boolean
  /** Show replay button — false in Hardcore mode */
  canReplay:   boolean
  timerKey:    number
  onClipEnd?:  () => void
  onClipStart?: () => void
}

/**
 * Central media block for Blind Test (songs).
 * - Hidden phase: SVG spinning disc (405×405) with optional replay overlay.
 * - Revealed phase: YouTube iframe (max-width 720px, height 405px, 16/9).
 * Both states share the same 405px height to avoid layout shifts.
 */
export function SpinningDisc({ song, isRevealed, canReplay, timerKey, onClipEnd, onClipStart }: SpinningDiscProps) {
  const playerRef = useRef<YouTubePlayerHandle>(null)

  // Replay the clip from startTime when revealed (clip may have ended during blind phase)
  useEffect(() => {
    if (isRevealed) playerRef.current?.replay()
  }, [isRevealed])

  function handleReplay() {
    playerRef.current?.replay()
  }

  return (
    <div className={styles.root}>
      {/* YouTube — always rendered for audio; visible only after reveal */}
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

      {/* SVG disc — visible only during blind phase */}
      {!isRevealed && (
        <div className={styles.discArea}>
          <img
            src="/assets/spinning-disc.svg"
            alt="Disque tournant"
            className={styles.disc}
            draggable={false}
          />
          {canReplay && (
            <button
              type="button"
              className={styles.replayBtn}
              onClick={handleReplay}
              title="Rejouer l'extrait"
              aria-label="Rejouer l'extrait"
            >
              {/* Material Icons "replay" path */}
              <svg viewBox="0 0 24 24" className={styles.replayIcon} aria-hidden>
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
