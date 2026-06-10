import { useState } from 'react'
import { AnswerInput } from '@/shared/Controls/AnswerInput'
import { TimerBar } from '@/shared/Components/TimerBar'
import { ScorePopAnimation } from '@/shared/Components/ScorePopAnimation'
import { useGameTimer } from '@/shared/hooks/useGameTimer'
import type { BlindTestIdolsProps } from './BlindTestIdols.types'
import styles from './BlindTestIdols.module.scss'
import { IdolCard } from '@/shared/Components/IdolCard'

/**
 * UI du round Blind Test portraits.
 * Le portrait est masqué (silhouette) pendant la saisie, révélé à la fin.
 */
export function BlindTestIdols({ idol, timerSeconds, timerKey, turnState, canReveal, onSubmit, onReveal, onTimeout }: BlindTestIdolsProps) {
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null)
  const [scorePopPts, setScorePopPts] = useState<number | null>(null)

  const { remaining, percentLeft } = useGameTimer({
    totalSeconds: timerSeconds,
    active: !turnState.isRevealed && timerSeconds > 0,
    onTimeout,
    resetKey: timerKey,
  })

  function handleSubmit(input: string) {
    const prevScore = turnState.scoreGained
    const result = onSubmit(input)
    setLastResult(result)
    setTimeout(() => setLastResult(null), 50)
    if (result === 'correct') {
      const gained = turnState.scoreGained - prevScore
      if (gained > 0) setScorePopPts(gained)
    }
  }

  const { artistMatched, titleMatched, isRevealed } = turnState

  return (
    <div className={styles.root}>
      {/* Une seule card centrée — même composant que le Save One */}
      <div className={styles.cardWrapper}>
        <IdolCard idol={idol} size="lg" hideInfos={true} onClick={() => {}} />
      </div>

      {/* Timer bar */}
      {timerSeconds > 0 && <TimerBar percentLeft={percentLeft} remainingSeconds={remaining} totalSeconds={timerSeconds} className={styles.timer} />}

      {/* Text input */}
      <AnswerInput
        onSubmit={handleSubmit}
        disabled={turnState.isRevealed}
        lastResult={lastResult}
        placeholder="Groupe et/ou nom de l'idole… puis Entrée"
      />

      {/* Answer badges */}
      <div className={styles.badges}>
        <span className={[styles.badge, artistMatched ? styles.badgeGreen : isRevealed ? styles.badgeRed : styles.badgeNeutral].join(' ')}>
          Groupe : {artistMatched ? `${idol.groupName} ✅` : isRevealed ? `${idol.groupName} ❌` : '???'}
        </span>
        <span className={[styles.badge, titleMatched ? styles.badgeGreen : isRevealed ? styles.badgeRed : styles.badgeNeutral].join(' ')}>
          Idole : {titleMatched ? `${idol.name} ✅` : isRevealed ? `${idol.name} ❌` : '???'}
        </span>

        {canReveal && !isRevealed && (
          <button type="button" className={styles.revealBtn} onClick={onReveal}>
            Révéler la réponse
          </button>
        )}
      </div>

      {scorePopPts !== null && <ScorePopAnimation points={scorePopPts} onDone={() => setScorePopPts(null)} />}
    </div>
  )
}
