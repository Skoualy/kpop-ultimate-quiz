import { useEffect, useRef, useState } from 'react'
import { IdolCard } from '@/shared/Components/IdolCard'
import { TimerBar } from '@/shared/Components/TimerBar'
import { CriterionBadge } from '@/shared/Components/CriterionBadge'
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
      {/* Timer — slot toujours réservé pour éviter le layout shift */}
      {timerSeconds > 0 && (
        <div className={styles.timerSlot}>
          <TimerBar
            percentLeft={voted ? 100 : percentLeft}
            remainingSeconds={voted ? timerSeconds : remaining}
            totalSeconds={timerSeconds}
          />
        </div>
      )}

      {/* Critère actif */}
      {activeCriterion && activeCriterion !== 'all' && <CriterionBadge criterion={activeCriterion} />}

      {/* Une seule card centrée — même composant que le Save One */}
      <div className={styles.cardWrapper}>
        <IdolCard idol={idol} size="lg" disabled={voted !== null} onClick={() => {}} />
      </div>

      {/* Boutons vote — POSITIF à gauche, NÉGATIF à droite */}
      <div className={styles.voteButtons}>
        {/* Positif (Smash / Top) — à gauche */}
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

        {/* Négatif (Pass / Flop) — à droite */}
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
