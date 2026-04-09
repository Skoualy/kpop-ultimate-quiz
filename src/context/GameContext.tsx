import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { GameConfig, GamePhase } from '@/shared/models'
import { DEFAULT_GAME_CONFIG } from '@/shared/constants'

interface GameContextValue {
  config:      GameConfig
  phase:       GamePhase
  currentRound: number
  score:        number
  setConfig:   (patch: Partial<GameConfig>) => void
  resetConfig: () => void
  startGame:   () => void
  nextRound:   () => void
  addPoint:    () => void
  resetGame:   () => void
}

const GameContext = createContext<GameContextValue | null>(null)

const STORAGE_KEY = 'kpopultimatequiz-config'

export function GameProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<GameConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Nettoyage des champs obsolètes (timerEnabled, advancedMode, roleFilter)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { timerEnabled: _te, advancedMode: _am, roleFilter: _rf, ...clean } = parsed
        // Migration roleFilter → roleFilters
        const migrated = { ...clean }
        if (!migrated.roleFilters) migrated.roleFilters = []
        return { ...DEFAULT_GAME_CONFIG, ...migrated }
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_GAME_CONFIG }
  })

  const [phase, setPhase]               = useState<GamePhase>('idle')
  const [currentRound, setCurrentRound] = useState(0)
  const [score, setScore]               = useState(0)

  const setConfig = useCallback((patch: Partial<GameConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const resetConfig = useCallback(() => {
    setConfigState({ ...DEFAULT_GAME_CONFIG })
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  function startGame()  { setPhase('playing'); setCurrentRound(1); setScore(0) }
  function addPoint()   { setScore((s) => s + 1) }
  function resetGame()  { setPhase('idle'); setCurrentRound(0); setScore(0) }

  function nextRound() {
    setCurrentRound((r) => {
      const next = r + 1
      if (next > config.rounds) { setPhase('finished'); return r }
      return next
    })
  }

  return (
    <GameContext.Provider value={{
      config, phase, currentRound, score,
      setConfig, resetConfig, startGame, nextRound, addPoint, resetGame,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameContext must be used inside GameProvider')
  return ctx
}
