import { useEffect, useRef, useState } from 'react'
// Composants réutilisés depuis save-one (cross-feature temporaire)
// TODO refactoring : migrer YouTubePlayer, TimerBar vers @/shared/Components/
import { YouTubePlayer } from '@/shared/Components/YouTubePlayer'
import { TimerBar } from '@/shared/Components/TimerBar'
import { useGameTimer } from '@/shared/hooks/useGameTimer'
import type { QuickVoteRoundSongsProps } from './QuickVoteRoundSongs.types'
import styles from './QuickVoteRoundSongs.module.scss'

export function QuickVoteRoundSongs({
  song,
  clipDuration,
  timerSeconds,
  timerKey,
  voteLabel,
  onVote,
  onTimeout,
}: QuickVoteRoundSongsProps) {
  const startRef = useRef(Date.now())
  const [voted, setVoted] = useState<'positive' | 'negative' | null>(null)
  const [videoError, setVideoError] = useState(false)
  // Contrôle du remontage du player YouTube pour le replay
  const [playerKey, setPlayerKey] = useState(0)

  // Reset à chaque nouveau round
  useEffect(() => {
    startRef.current = Date.now()
    setVoted(null)
    setVideoError(false)
    setPlayerKey((k) => k + 1) // forcer le remontage du player
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
      {/* Player YouTube */}
      <div className={styles.playerWrapper}>
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

      {/* Infos de la chanson */}
      <div className={styles.songInfo}>
        <p className={styles.songTitle}>{song.title}</p>
        <p className={styles.songGroup}>{song.groupName}</p>
        {!voted && !videoError && (
          <button className={styles.replayBtn} onClick={handleReplay}>
            ↺ Rejouer
          </button>
        )}
      </div>

      {/* Timer — slot toujours réservé */}
      <div className={styles.timerSlot}>
        {timerSeconds > 0 && (
          <TimerBar
            percentLeft={voted ? 100 : percentLeft}
            remainingSeconds={voted ? timerSeconds : remaining}
            totalSeconds={timerSeconds}
            className={styles.timer}
          />
        )}
      </div>

      {/* Boutons vote — négatif à gauche, positif à droite */}
      <div className={styles.voteButtons}>
        <button
          className={[
            styles.voteBtn,
            styles['voteBtn--negative'],
            voted === 'negative' ? styles['voteBtn--active'] : '',
          ].join(' ')}
          disabled={voted !== null}
          onClick={() => handleVote('negative')}
        >
          {voteLabel.negative}
        </button>
        <button
          className={[
            styles.voteBtn,
            styles['voteBtn--positive'],
            voted === 'positive' ? styles['voteBtn--active'] : '',
          ].join(' ')}
          disabled={voted !== null}
          onClick={() => handleVote('positive')}
        >
          {voteLabel.positive}
        </button>
      </div>
    </div>
  )
}
