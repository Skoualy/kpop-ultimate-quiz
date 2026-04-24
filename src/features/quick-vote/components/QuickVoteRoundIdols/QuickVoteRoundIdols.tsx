import { useEffect, useRef, useState } from 'react'
// Composants réutilisés depuis save-one (cross-feature temporaire)
// TODO refactoring : migrer IdolCard, TimerBar, CriterionBadge vers @/shared/Components/
import { IdolCard } from '@/shared/Components/IdolCard'
import { TimerBar } from '@/shared/Components/TimerBar'
import { CriterionBadge } from '@/shared/Components/CriterionBadge'
// useGameTimer reste dans save-one/hooks — pas besoin de le déplacer
import { useGameTimer } from '@/shared/hooks/useGameTimer'
import type { QuickVoteRoundIdolsProps } from './QuickVoteRoundIdols.types'
import styles from './QuickVoteRoundIdols.module.scss'

export function QuickVoteRoundIdols({
  idol,
  timerSeconds,
  timerKey,
  activeCriterion,
  voteLabel,
  onVote,
  onTimeout,
}: QuickVoteRoundIdolsProps) {
  const startRef = useRef(Date.now())
  const [voted, setVoted] = useState<'positive' | 'negative' | null>(null)

  // Reset à chaque nouveau round (timerKey change)
  useEffect(() => {
    startRef.current = Date.now()
    setVoted(null)
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

  return (
    <div className={styles.root}>
      {/* Critère actif */}
      {activeCriterion && activeCriterion !== 'all' && <CriterionBadge criterion={activeCriterion} />}

      {/* Timer — slot toujours réservé pour éviter le layout shift */}
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

      {/* Carte idole unique — centrée */}
      <div className={styles.cardWrapper}>
        <IdolCard idol={idol} size="lg" disabled={voted !== null} onClick={() => {}} />
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
