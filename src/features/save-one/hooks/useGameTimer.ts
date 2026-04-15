import { useCallback, useEffect, useRef, useState } from 'react'

interface UseGameTimerOptions {
  totalSeconds: number  // 0 = pas de timer
  active: boolean
  onTimeout: () => void
  /** Incrémenter pour resetter le timer sans démonter le composant */
  resetKey?: number
}

interface UseGameTimerReturn {
  remaining: number
  percentLeft: number
  isActive: boolean
  reset: () => void
}

/**
 * Timer avec reset par resetKey.
 * - totalSeconds = 0 → désactivé, aucun tick
 * - active = false → pausé
 * - resetKey change → redémarre depuis totalSeconds
 */
export function useGameTimer({
  totalSeconds,
  active,
  onTimeout,
  resetKey = 0,
}: UseGameTimerOptions): UseGameTimerReturn {
  const [remaining, setRemaining] = useState(totalSeconds)
  const onTimeoutRef = useRef(onTimeout)
  const firedRef     = useRef(false)

  useEffect(() => { onTimeoutRef.current = onTimeout }, [onTimeout])

  // Reset quand totalSeconds ou resetKey change
  useEffect(() => {
    setRemaining(totalSeconds)
    firedRef.current = false
  }, [totalSeconds, resetKey])

  useEffect(() => {
    if (totalSeconds === 0 || !active || remaining <= 0) return

    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        if (next <= 0 && !firedRef.current) {
          firedRef.current = true
          setTimeout(() => onTimeoutRef.current(), 0)
          return 0
        }
        return Math.max(next, 0)
      })
    }, 1000)

    return () => clearInterval(id)
  }, [totalSeconds, active, remaining])

  const reset = useCallback(() => {
    setRemaining(totalSeconds)
    firedRef.current = false
  }, [totalSeconds])

  const percentLeft = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 100

  return {
    remaining,
    percentLeft,
    isActive: totalSeconds > 0 && active && remaining > 0,
    reset,
  }
}
