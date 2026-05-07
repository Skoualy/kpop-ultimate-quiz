import { useEffect, useRef, useState } from 'react'
import { YouTubePlayer } from '@/shared/Components/YouTubePlayer'
import { TimerBar } from '@/shared/Components/TimerBar'
import { useGameTimer } from '@/shared/hooks/useGameTimer'
import type { QuickVoteRoundSongsProps } from './QuickVoteRoundSongs.types'
import styles from './QuickVoteRoundSongs.module.scss'
import { SongThumbnail } from '@/shared/Components/SongThumbnail/SongThumbnail'

export function QuickVoteRoundSongs({
  song,
  timerSeconds,
  timerKey,
  voteLabel,
  onVote,
  onTimeout,
}: QuickVoteRoundSongsProps) {
  const startRef = useRef(Date.now())
  const [voted, setVoted] = useState<'positive' | 'negative' | null>(null)
  const [videoError, setVideoError] = useState(false)
  const [playerKey, setPlayerKey] = useState(0)

  useEffect(() => {
    startRef.current = Date.now()
    setVoted(null)
    setVideoError(false)
    setPlayerKey((k) => k + 1)
  }, [timerKey])

  const { remaining, percentLeft } = useGameTimer({
    totalSeconds: timerSeconds,
    active: voted === null,
    onTimeout,
    resetKey: timerKey,
  })

  const handleVote = (v: 'positive' | 'negative') => {
    if (voted !== null) return
    setVoted(v)
    onVote(v, Date.now() - startRef.current)
  }

  const handleReplay = () => {
    if (voted) return
    setVideoError(false)
    setPlayerKey((k) => k + 1)
  }

  return (
    <div className={styles.root}>
      {/* Player YouTube — même wrapper max-width que SaveOneRoundSongs */}
      <div className={styles.iframeWrapper}>
        {!videoError && !voted ? (
          <YouTubePlayer
            key={`qv-yt-${timerKey}-${playerKey}`}
            videoId={song.youtubeId}
            startTime={song.startTime}
            endTime={song.endTime}
            onError={() => setVideoError(true)}
            autoplay
            className={styles.player}
          />
        ) : videoError ? (
          <div className={styles.videoError}>
            <span>⚠️</span>
            <p>Vidéo indisponible</p>
          </div>
        ) : null}
      </div>

      {/* Timer */}
      {timerSeconds > 0 && (
        <div className={styles.timerSlot}>
          <TimerBar
            percentLeft={voted ? 100 : percentLeft}
            remainingSeconds={voted ? timerSeconds : remaining}
            totalSeconds={timerSeconds}
          />
        </div>
      )}

      {/* Infos chanson */}
      <div className={styles.thumbnails}>
        <SongThumbnail
          key={song.songId}
          song={song}
          revealed={true}
          replayEnabled={true}
          //isPlaying={idx === activeIdx}
          //isSequencePlaying={!sequenceComplete}
          //disabled={!sequenceComplete || !!chosen}
          onChoose={undefined}
          onReplay={handleReplay}
        />
      </div>

      {/* Boutons vote — POSITIF à gauche, NÉGATIF à droite */}
      <div className={styles.voteButtons}>
        <button
          className={[styles.voteBtn, styles.voteBtnPositive, voted === 'positive' ? styles.voteBtnActive : ''].join(
            ' ',
          )}
          disabled={voted !== null}
          onClick={() => handleVote('positive')}
        >
          <span className={styles.voteBtnIcon} aria-hidden>
            ♥
          </span>
          <span className={styles.voteBtnLabel}>{voteLabel.positive}</span>
        </button>

        <button
          className={[styles.voteBtn, styles.voteBtnNegative, voted === 'negative' ? styles.voteBtnActive : ''].join(
            ' ',
          )}
          disabled={voted !== null}
          onClick={() => handleVote('negative')}
        >
          <span className={styles.voteBtnIcon} aria-hidden>
            ✕
          </span>
          <span className={styles.voteBtnLabel}>{voteLabel.negative}</span>
        </button>
      </div>
    </div>
  )
}
