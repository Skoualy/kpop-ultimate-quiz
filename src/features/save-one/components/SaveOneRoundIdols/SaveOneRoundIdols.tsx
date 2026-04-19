import { useEffect, useRef, useState } from 'react'
import { IdolCard } from '../IdolCard'
import { TimerBar } from '../TimerBar'
import { useGameTimer } from '../../hooks/useGameTimer'
import type { SaveOneRoundIdolsProps } from './SaveOneRoundIdols.types'
import type { IdolItem } from '../../SaveOnePage.types'
import styles from './SaveOneRoundIdols.module.scss'

export function SaveOneRoundIdols({
  idols,
  timerSeconds,
  timerKey,
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

  return (
    <div className={styles.root}>
      {/* Timer — espace toujours réservé */}
      <div className={styles.timerSlot}>
        {timerSeconds > 0 && (
          <TimerBar
            percentLeft={chosen ? 100 : percentLeft}
            remainingSeconds={chosen ? timerSeconds : remaining}
            totalSeconds={timerSeconds}
            className={styles.timer}
          />
        )}
      </div>

      {/* Grille — cards toujours à 260px */}
      <div className={styles.grid}>
        {idols.map((idol: IdolItem) => (
          <IdolCard
            key={idol.idolId}
            idol={idol}
            size="lg"
            disabled={chosen !== null}
            onClick={handleChoose}
          />
        ))}
      </div>
    </div>
  )
}
