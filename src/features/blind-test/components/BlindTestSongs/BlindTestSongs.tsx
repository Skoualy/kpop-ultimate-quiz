import { useState } from 'react'
import { SpinningDisc } from '../SpinningDisc'
import { AnswerInput } from '@/shared/Controls/AnswerInput'
import { TimerBar } from '@/shared/Components/TimerBar'
import { ScorePopAnimation } from '@/shared/Components/ScorePopAnimation'
import { useGameTimer } from '@/shared/hooks/useGameTimer'
import type { BlindTestSongsProps } from './BlindTestSongs.types'
import styles from './BlindTestSongs.module.scss'

/**
 * UI du round Blind Test chansons.
 * Gère l'affichage du disque / iframe, les badges de réponse, le timer et l'input.
 */
export function BlindTestSongs({
  song,
  timerSeconds,
  timerKey,
  turnState,
  canReplay,
  canReveal,
  onSubmit,
  onReveal,
  onTimeout,
  onClipEnd,
}: BlindTestSongsProps) {
  const [lastResult, setLastResult]   = useState<'correct' | 'wrong' | null>(null)
  const [scorePopPts, setScorePopPts] = useState<number | null>(null)

  const { remaining, percentLeft } = useGameTimer({
    totalSeconds: timerSeconds,
    active:       !turnState.isRevealed && timerSeconds > 0,
    onTimeout,
    resetKey:     timerKey,
  })

  function handleSubmit(input: string) {
    const prevScore = turnState.scoreGained
    const result    = onSubmit(input)
    setLastResult(result)
    // Reset feedback quickly so re-submitting cycles the shake
    setTimeout(() => setLastResult(null), 50)
    if (result === 'correct') {
      const gained = turnState.scoreGained - prevScore
      if (gained > 0) setScorePopPts(gained)
    }
  }

  const { artistMatched, titleMatched, isRevealed } = turnState
  const inputDisabled = isRevealed

  return (
    <div className={styles.root}>
      {/* Central media block — 405px constant height */}
      <SpinningDisc
        song={song}
        isRevealed={isRevealed}
        canReplay={canReplay}
        timerKey={timerKey}
        onClipEnd={onClipEnd}
      />

      {/* Timer bar */}
      {timerSeconds > 0 && (
        <TimerBar
          percentLeft={percentLeft}
          remainingSeconds={remaining}
          totalSeconds={timerSeconds}
          className={styles.timer}
        />
      )}

      {/* Answer badges */}
      <div className={styles.badges}>
        <span className={[styles.badge, artistMatched ? styles.badgeGreen : isRevealed ? styles.badgeRed : styles.badgeNeutral].join(' ')}>
          Artiste : {artistMatched ? `${song.groupName} ✅` : isRevealed ? `${song.groupName} ❌` : '???'}
        </span>
        <span className={[styles.badge, titleMatched ? styles.badgeGreen : isRevealed ? styles.badgeRed : styles.badgeNeutral].join(' ')}>
          Titre : {titleMatched ? `${song.title} ✅` : isRevealed ? `${song.title} ❌` : '???'}
        </span>
      </div>

      {/* Text input */}
      <AnswerInput
        onSubmit={handleSubmit}
        disabled={inputDisabled}
        lastResult={lastResult}
      />

      {/* Reveal button — hidden when already revealed or in hardcore */}
      {canReveal && !isRevealed && (
        <button type="button" className={styles.revealBtn} onClick={onReveal}>
          Révéler la réponse
        </button>
      )}

      {/* Score pop animation */}
      {scorePopPts !== null && (
        <ScorePopAnimation points={scorePopPts} onDone={() => setScorePopPts(null)} />
      )}
    </div>
  )
}
