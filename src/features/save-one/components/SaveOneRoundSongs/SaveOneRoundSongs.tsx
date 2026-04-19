import { useEffect, useRef, useState } from 'react'
import { SongThumbnail } from '../SongThumbnail'
import { YouTubePlayer } from '../YouTubePlayer'
import { TimerBar } from '../TimerBar'
import { useGameTimer } from '../../hooks/useGameTimer'
import type { SongItem } from '../../SaveOnePage.types'
import type { SaveOneRoundSongsProps } from './SaveOneRoundSongs.types'
import styles from './SaveOneRoundSongs.module.scss'

export function SaveOneRoundSongs({
  songs,
  clipDuration,
  timerSeconds,
  timerKey,
  player2Mode = false,
  playerName,
  playerIndex = 0,
  onChoose,
  onPass,
  onTimeout,
}: SaveOneRoundSongsProps) {
  const [activeIdx, setActiveIdx]               = useState<number | null>(0)
  const [revealedCount, setRevealedCount]       = useState(1)
  const [sequenceComplete, setSequenceComplete] = useState(false)
  const [chosen, setChosen]                     = useState<string | null>(null)
  const [videoError, setVideoError]             = useState(false)

  const startRef      = useRef(Date.now())
  const advanceFnRef  = useRef<() => void>(() => {})
  const iframeRef     = useRef<HTMLIFrameElement>(null)
  const lastIdxRef    = useRef<number>(0)
  const [frozenIdx, setFrozenIdx] = useState<number | null>(null)

  // ── Reset à chaque timerKey ───────────────────────────────────────────────

  useEffect(() => {
    setChosen(null)
    setVideoError(false)

    if (player2Mode) {
      setActiveIdx(null)
      setFrozenIdx(lastIdxRef.current)
      setRevealedCount(songs.length)
      setSequenceComplete(true)
      startRef.current = Date.now()
    } else {
      setActiveIdx(0)
      setFrozenIdx(null)
      setRevealedCount(1)
      setSequenceComplete(false)
    }
  }, [timerKey, player2Mode, songs.length])

  useEffect(() => {
    if (sequenceComplete && !player2Mode) {
      startRef.current = Date.now()
    }
  }, [sequenceComplete, player2Mode])

  // ── Fade audio out ────────────────────────────────────────────────────────

  const fadeOutAndAdvance = () => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) { advanceFnRef.current(); return }
    let vol = 80
    const step = () => {
      vol -= 16
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.max(0, vol)] }), '*'
      )
      if (vol > 0) {
        setTimeout(step, 50)
      } else {
        setTimeout(() => {
          iframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*'
          )
          advanceFnRef.current()
        }, 100)
      }
    }
    step()
  }

  // ── Avancement séquence J1 ────────────────────────────────────────────────

  const advanceSequence = () => {
    if (player2Mode) return
    setActiveIdx((currentIdx) => {
      if (currentIdx === null) return null
      const next = currentIdx + 1
      lastIdxRef.current = next < songs.length ? next : currentIdx
      if (next < songs.length) {
        setRevealedCount((c) => Math.max(c, next + 1))
        return next
      }
      setSequenceComplete(true)
      setRevealedCount(songs.length)
      return currentIdx
    })
  }

  advanceFnRef.current = advanceSequence

  useEffect(() => {
    if (player2Mode || sequenceComplete || activeIdx === null) return
    const buffer = activeIdx === 0 ? 1500 : 800
    const id = setTimeout(() => fadeOutAndAdvance(), clipDuration * 1000 + buffer)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, sequenceComplete, clipDuration, player2Mode])

  // ── Timer de round ────────────────────────────────────────────────────────

  const { remaining, percentLeft } = useGameTimer({
    totalSeconds: sequenceComplete ? timerSeconds : 0,
    active: chosen === null,
    onTimeout,
    resetKey: timerKey,
  })

  // ── Gestion erreur ─────────────────────────────────────────────────────────

  const handleVideoError = () => {
    setVideoError(true)
    if (!player2Mode) advanceFnRef.current()
  }

  // ── Passer extrait (J1 pendant séquence) ──────────────────────────────────

  const handleSkipClip = () => {
    if (player2Mode || sequenceComplete) return
    fadeOutAndAdvance()
  }

  // ── Actions joueur ────────────────────────────────────────────────────────

  const handleChoose = (songId: string) => {
    if (!sequenceComplete || chosen) return
    setChosen(songId)
    setActiveIdx(null)
    setFrozenIdx(null)
    onChoose(songId, Date.now() - startRef.current)
  }

  const handleReplay = (song: SongItem) => {
    if (!sequenceComplete) return
    const idx = songs.findIndex((s) => s.songId === song.songId)
    setFrozenIdx(null)
    setVideoError(false)
    if (idx === activeIdx) {
      setActiveIdx(null)
      requestAnimationFrame(() => setActiveIdx(idx))
    } else {
      setActiveIdx(idx)
    }
  }

  const iframeIdx   = activeIdx !== null ? activeIdx : null
  const showFrozen  = player2Mode && frozenIdx !== null && activeIdx === null
  const displayIdx  = iframeIdx ?? (showFrozen ? frozenIdx : null)
  const useAutoplay = !player2Mode || activeIdx !== null
  const currentSong = displayIdx !== null ? songs[displayIdx] : null

  const playerBadgeClass = playerIndex === 1 ? styles.playerNameP2 : styles.playerNameP1

  return (
    <div className={styles.root}>
      {/* Badge joueur (2J) */}
      {playerName && (
        <div className={styles.playerNameRow}>
          <span className={[styles.playerName, playerBadgeClass].join(' ')}>{playerName}</span>
        </div>
      )}

      {/* Iframe YouTube */}
      <div className={styles.iframeWrapper} ref={(el) => { iframeRef.current = el?.querySelector('iframe') ?? null }}>
        {currentSong && !videoError && !chosen ? (
          <YouTubePlayer
            key={`yt-${timerKey}-p${playerIndex}-${displayIdx}-${useAutoplay ? 'auto' : 'frozen'}`}
            videoId={currentSong.youtubeId}
            startTime={currentSong.startTime}
            endTime={currentSong.endTime}
            onError={handleVideoError}
            autoplay={useAutoplay}
            className={styles.player}
          />
        ) : videoError ? (
          <div className={styles.videoError}><span>⚠️</span><p>Vidéo indisponible</p></div>
        ) : null}
      </div>

      {/* Timer — slot toujours réservé */}
      <div className={styles.timerSlot}>
        {sequenceComplete && timerSeconds > 0 && (
          <TimerBar
            percentLeft={chosen ? 100 : percentLeft}
            remainingSeconds={chosen ? timerSeconds : remaining}
            totalSeconds={timerSeconds}
            className={styles.timer}
          />
        )}
      </div>

      {/* Miniatures — chaque card gère son propre bouton Passer/Rejouer */}
      <div className={[styles.thumbnails, styles[`cols${songs.length}`]].join(' ')}>
        {songs.map((song, idx) => (
          <SongThumbnail
            key={song.songId}
            song={song}
            revealed={idx < revealedCount}
            replayEnabled={sequenceComplete && idx < revealedCount && !chosen}
            isPlaying={idx === activeIdx}
            isSequencePlaying={!sequenceComplete}
            disabled={!sequenceComplete || !!chosen}
            onChoose={handleChoose}
            onReplay={handleReplay}
            // Passer est disponible sur toutes les cards pendant la séquence,
            // mais n'est ACTIVÉ que sur la card en lecture (isPlaying).
            onSkip={!player2Mode && !sequenceComplete ? handleSkipClip : undefined}
          />
        ))}
      </div>
    </div>
  )
}
