import { useCallback, useEffect, useRef, useState } from 'react'
import { SongThumbnail } from '../SongThumbnail'
import { YouTubePlayer } from '../YouTubePlayer'
import { TimerBar } from '../TimerBar'
import { useGameTimer } from '../../hooks/useGameTimer'
import type { YouTubePlayerHandle } from '../YouTubePlayer'
import type { SongItem } from '../../SaveOnePage.types'
import type { SaveOneRoundSongsProps } from './SaveOneRoundSongs.types'
import styles from './SaveOneRoundSongs.module.scss'

export function SaveOneRoundSongs({
  songs,
  clipDuration,
  timerSeconds,
  timerKey,
  player2Mode = false,
  onChoose,
  onPass,
  onTimeout,
}: SaveOneRoundSongsProps) {
  const [playingIndex, setPlayingIndex]         = useState(0)
  const [revealedCount, setRevealedCount]       = useState(player2Mode ? songs.length : 1)
  const [sequenceComplete, setSequenceComplete] = useState(player2Mode)
  const [chosen, setChosen]                     = useState<string | null>(null)
  const [videoError, setVideoError]             = useState(false)

  const playerRef   = useRef<YouTubePlayerHandle>(null)
  const startRef    = useRef(Date.now())

  // Stable ref pour advanceSequence (évite la stale closure dans useEffect)
  const advanceRef  = useRef<() => void>(null!)

  // ── Reset lors d'un nouveau round/joueur ──────────────────────────────────

  useEffect(() => {
    if (player2Mode) {
      setPlayingIndex(0)
      setRevealedCount(songs.length)
      setSequenceComplete(true)
    } else {
      setPlayingIndex(0)
      setRevealedCount(1)
      setSequenceComplete(false)
    }
    setChosen(null)
    setVideoError(false)
    startRef.current = Date.now()
  }, [timerKey, player2Mode, songs.length])

  // ── Avancement de la séquence ─────────────────────────────────────────────

  const advanceSequence = useCallback(() => {
    setPlayingIndex((currentIdx) => {
      const nextIndex = currentIdx + 1
      if (nextIndex < songs.length) {
        setRevealedCount((c) => Math.max(c, nextIndex + 1))
        return nextIndex
      } else {
        // Tous les extraits joués
        setSequenceComplete(true)
        setRevealedCount(songs.length)
        return currentIdx // ne change pas l'index
      }
    })
  }, [songs.length])

  // Mettre à jour la ref à chaque render
  advanceRef.current = advanceSequence

  /**
   * Timer JS déclenché dès que playingIndex change (et séquence pas encore complète).
   * Plus fiable que les events YT postMessage.
   * +1s de buffer pour le chargement initial de l'iframe.
   */
  useEffect(() => {
    if (sequenceComplete) return

    const buffer = playingIndex === 0 ? 1500 : 800 // plus de marge pour le 1er
    const timer = setTimeout(
      () => advanceRef.current(),
      clipDuration * 1000 + buffer,
    )
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingIndex, sequenceComplete, clipDuration])

  // ── Timer de round (après séquence complète) ──────────────────────────────

  const { remaining, percentLeft } = useGameTimer({
    totalSeconds: sequenceComplete ? timerSeconds : 0,
    active: chosen === null,
    onTimeout,
    resetKey: timerKey,
  })

  // ── Gestion erreur vidéo ──────────────────────────────────────────────────

  const handleVideoError = useCallback(() => {
    setVideoError(true)
    // Avancer quand même si la vidéo est indisponible
    advanceRef.current()
  }, [])

  // ── Actions joueur ────────────────────────────────────────────────────────

  const handleChoose = (songId: string) => {
    if (!sequenceComplete || chosen) return
    setChosen(songId)
    onChoose(songId, Date.now() - startRef.current)
  }

  const handlePass = () => {
    if (chosen) return
    setChosen('__pass__')
    onPass(Date.now() - startRef.current)
  }

  const handleReplay = (song: SongItem) => {
    if (!sequenceComplete) return
    const idx = songs.findIndex((s) => s.songId === song.songId)
    if (idx === playingIndex) {
      playerRef.current?.replay()
    } else {
      setPlayingIndex(idx)
      setVideoError(false)
    }
  }

  const currentSong = songs[playingIndex]

  return (
    <div className={styles.root}>
      {/* ── Label chanson en cours ── */}
      {!sequenceComplete && currentSong && (
        <div className={styles.nowPlaying}>
          <span className={styles.nowPlayingIcon}>♪</span>
          <span className={styles.nowPlayingTitle}>{currentSong.title}</span>
          <span className={styles.nowPlayingCounter}>{playingIndex + 1} / {songs.length}</span>
        </div>
      )}

      {/* ── YouTube iframe ── */}
      <div className={styles.iframeWrapper}>
        {!videoError && currentSong ? (
          <YouTubePlayer
            ref={playerRef}
            key={`yt-${timerKey}-${playingIndex}`}
            videoId={currentSong.youtubeId}
            startTime={currentSong.startTime}
            endTime={currentSong.endTime}
            onError={handleVideoError}
            className={styles.player}
          />
        ) : videoError ? (
          <div className={styles.videoError}>
            <span>⚠️</span>
            <p>Vidéo indisponible</p>
          </div>
        ) : null}
      </div>

      {/* ── Timer ── */}
      {sequenceComplete && timerSeconds > 0 && (
        <TimerBar
          percentLeft={chosen ? 100 : percentLeft}
          remainingSeconds={chosen ? timerSeconds : remaining}
          totalSeconds={timerSeconds}
          className={styles.timer}
        />
      )}

      {/* ── Miniatures ── */}
      <div className={[styles.thumbnails, styles[`cols${songs.length}`]].join(' ')}>
        {songs.map((song, idx) => (
          <SongThumbnail
            key={song.songId}
            song={song}
            revealed={idx < revealedCount}
            replayEnabled={sequenceComplete && idx < revealedCount}
            isPlaying={idx === playingIndex && !sequenceComplete}
            disabled={!sequenceComplete || !!chosen}
            onChoose={handleChoose}
            onReplay={handleReplay}
          />
        ))}
      </div>
    </div>
  )
}
