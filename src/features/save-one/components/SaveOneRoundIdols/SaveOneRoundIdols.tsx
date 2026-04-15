import { useEffect, useRef, useState } from 'react'
import { IdolCard } from '../IdolCard'
import { TimerBar } from '../TimerBar'
import { CriterionBadge } from '../CriterionBadge'
import { useGameTimer } from '../../hooks/useGameTimer'
import type { SaveOneRoundIdolsProps } from './SaveOneRoundIdols.types'
import type { IdolItem } from '../../SaveOnePage.types'
import styles from './SaveOneRoundIdols.module.scss'

function cardSize(count: number): 'sm' | 'md' | 'lg' {
  if (count <= 2) return 'lg'
  if (count <= 3) return 'md'
  return 'sm'
}

function gridClass(count: number): string {
  if (count === 2) return styles.grid2
  if (count === 3) return styles.grid3
  if (count === 4) return styles.grid4
  return styles.grid5
}

export function SaveOneRoundIdols({
  idols,
  timerSeconds,
  timerKey,
  activeCriterion,
  onChoose,
  onPass,
  onTimeout,
}: SaveOneRoundIdolsProps) {
  const startRef = useRef(Date.now())
  const [chosen, setChosen] = useState<string | null>(null)

  useEffect(() => {
    startRef.current = Date.now()
    setChosen(null)
  }, [timerKey])

  const { remaining, percentLeft } = useGameTimer({
    totalSeconds: timerSeconds,
    active: chosen === null,
    onTimeout,
    resetKey: timerKey,
  })

  const handleChoose = (idolId: string) => {
    if (chosen) return
    setChosen(idolId)
    onChoose(idolId, Date.now() - startRef.current)
  }

  const handlePass = () => {
    if (chosen) return
    setChosen('__pass__')
    onPass(Date.now() - startRef.current)
  }

  const size = cardSize(idols.length)

  return (
    <div className={styles.root}>
      {/* Badge critère — centré au-dessus des cartes */}
      <div className={styles.criterionRow}>
        <CriterionBadge criterion={activeCriterion} />
      </div>

      {/* Timer */}
      {timerSeconds > 0 && (
        <TimerBar
          percentLeft={chosen ? 100 : percentLeft}
          remainingSeconds={chosen ? timerSeconds : remaining}
          totalSeconds={timerSeconds}
          className={styles.timer}
        />
      )}

      {/* Grille de cards */}
      <div className={[styles.grid, gridClass(idols.length)].join(' ')}>
        {idols.map((idol: IdolItem) => (
          <IdolCard
            key={idol.idolId}
            idol={idol}
            size={size}
            disabled={chosen !== null}
            onClick={handleChoose}
          />
        ))}
      </div>
    </div>
  )
}
