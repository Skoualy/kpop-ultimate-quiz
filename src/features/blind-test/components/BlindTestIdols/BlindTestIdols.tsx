import { useState } from 'react'
import { AnswerInput } from '@/shared/Controls/AnswerInput'
import { TimerBar } from '@/shared/Components/TimerBar'
import { ScorePopAnimation } from '@/shared/Components/ScorePopAnimation'
import { useGameTimer } from '@/shared/hooks/useGameTimer'
import type { BlindTestIdolsProps } from './BlindTestIdols.types'
import styles from './BlindTestIdols.module.scss'

const PLACEHOLDER_F = '/assets/placeholders/idol-female.webp'
const PLACEHOLDER_M = '/assets/placeholders/idol-male.webp'

/**
 * UI du round Blind Test portraits.
 * Le portrait est masqué (silhouette) pendant la saisie, révélé à la fin.
 */
export function BlindTestIdols({
  idol,
  timerSeconds,
  timerKey,
  turnState,
  canReveal,
  onSubmit,
  onReveal,
  onTimeout,
}: BlindTestIdolsProps) {
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
    setTimeout(() => setLastResult(null), 50)
    if (result === 'correct') {
      const gained = turnState.scoreGained - prevScore
      if (gained > 0) setScorePopPts(gained)
    }
  }

  const { artistMatched, titleMatched, isRevealed } = turnState
  const portrait = idol.portrait ?? PLACEHOLDER_F

  return (
    <div className={styles.root}>
      {/* Portrait block — same 405px height as SpinningDisc/iframe */}
      <div className={styles.portraitBlock}>
        <img
          src={isRevealed ? portrait : (PLACEHOLDER_M)}
          alt={isRevealed ? idol.name : '?'}
          className={[styles.portrait, !isRevealed ? styles.hidden : ''].join(' ')}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_F }}
          draggable={false}
        />
        {!isRevealed && (
          <div className={styles.silhouette}>
            <span className={styles.questionMark}>?</span>
          </div>
        )}
      </div>

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
          Groupe : {artistMatched ? `${idol.groupName} ✅` : isRevealed ? `${idol.groupName} ❌` : '???'}
        </span>
        <span className={[styles.badge, titleMatched ? styles.badgeGreen : isRevealed ? styles.badgeRed : styles.badgeNeutral].join(' ')}>
          Idole : {titleMatched ? `${idol.name} ✅` : isRevealed ? `${idol.name} ❌` : '???'}
        </span>
      </div>

      {/* Text input */}
      <AnswerInput
        onSubmit={handleSubmit}
        disabled={turnState.isRevealed}
        lastResult={lastResult}
        placeholder="Groupe ou nom de l'idole… puis Entrée"
      />

      {canReveal && !isRevealed && (
        <button type="button" className={styles.revealBtn} onClick={onReveal}>
          Révéler la réponse
        </button>
      )}

      {scorePopPts !== null && (
        <ScorePopAnimation points={scorePopPts} onDone={() => setScorePopPts(null)} />
      )}
    </div>
  )
}
