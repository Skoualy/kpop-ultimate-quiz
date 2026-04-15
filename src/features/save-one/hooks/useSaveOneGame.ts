import { useCallback, useEffect, useRef, useState } from 'react'
import type { Group, Idol } from '@/shared/models'
import type { GameConfig } from '@/shared/models'
import type { GamePhase, IdolItem, PlayerIndex, RoundData, RoundResult, SongItem } from '../SaveOnePage.types'
import { buildIdolPool, buildRounds, buildSongPool } from '../helpers/poolBuilder'
import { groupService } from '@/shared/services/groupService'
import { idolService } from '@/shared/services/idolService'

interface GameState {
  phase: GamePhase
  currentRoundIndex: number
  currentPlayer: PlayerIndex
  timerKey: number
}

interface UseSaveOneGameReturn extends GameState {
  isLoading: boolean
  error: string | null
  rounds: RoundData[]
  results: RoundResult[]
  choose: (id: string, timeMs: number) => void
  pass: (timeMs?: number) => void
  timeout: () => void
  skipPlayerTransition: () => void
  skipRoundTransition: () => void
  restart: () => void
}

export function useSaveOneGame(config: GameConfig): UseSaveOneGameReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [rounds, setRounds]       = useState<RoundData[]>([])
  const [results, setResults]     = useState<RoundResult[]>([])
  const [state, setState]         = useState<GameState>({
    phase: 'loading', currentRoundIndex: 0, currentPlayer: 0, timerKey: 0,
  })

  const roundsRef = useRef<RoundData[]>([])
  useEffect(() => { roundsRef.current = rounds }, [rounds])

  // ─── Chargement ──────────────────────────────────────────────────────────

  const loadGame = useCallback(async (cancelled: { value: boolean }) => {
    setIsLoading(true)
    setError(null)

    try {
      let groups: Group[]
      if (config.gamePlayMode === 'custom' && config.selectedGroupIds.length > 0) {
        const all = await groupService.getAll()
        groups = all.filter((g) => config.selectedGroupIds.includes(g.id))
      } else {
        groups = await groupService.getAll()
      }
      if (cancelled.value) return

      let pool: IdolItem[] | SongItem[]
      if (config.category === 'idols') {
        const allIdols: Idol[] = await idolService.getAll()
        if (cancelled.value) return
        pool = buildIdolPool(groups, allIdols, {
          roleFilters: config.roleFilters,
          criterion: config.criterion,
        }) as IdolItem[]
      } else {
        pool = buildSongPool(groups, {
          songType: config.songType,
          clipDuration: config.clipDuration,
        }) as SongItem[]
      }

      const builtRounds = buildRounds(pool, {
        totalRounds: config.rounds,
        dropCount: config.drops,
        criterion: config.criterion,
      })

      if (cancelled.value) return

      setRounds(builtRounds)
      setResults([])
      setState({
        phase: builtRounds.length === 0 ? 'summary' : 'roundTransition',
        currentRoundIndex: 0,
        currentPlayer: 0,
        timerKey: 0,
      })
    } catch (e) {
      if (!cancelled.value) setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      if (!cancelled.value) setIsLoading(false)
    }
  }, [config])

  useEffect(() => {
    const cancelled = { value: false }
    loadGame(cancelled)
    return () => { cancelled.value = true }
  }, [loadGame])

  // ─── Enregistrement + transitions ────────────────────────────────────────

  const recordResult = useCallback(
    (result: Omit<RoundResult, 'roundIndex' | 'playerIndex'>) => {
      setState((prev) => {
        const { currentRoundIndex, currentPlayer } = prev
        const totalRounds = roundsRef.current.length

        setResults((r) => [
          ...r,
          { ...result, roundIndex: currentRoundIndex, playerIndex: currentPlayer },
        ])

        if (config.twoPlayerMode && currentPlayer === 0) {
          return { ...prev, phase: 'playerTransition', timerKey: prev.timerKey + 1 }
        }

        const nextIndex  = currentRoundIndex + 1
        if (nextIndex >= totalRounds) return { ...prev, phase: 'summary' }

        return {
          ...prev,
          phase: 'roundTransition',
          currentRoundIndex: nextIndex,
          currentPlayer: 0 as PlayerIndex,
          timerKey: prev.timerKey + 1,
        }
      })
    },
    [config.twoPlayerMode],
  )

  const choose  = useCallback((id: string, timeMs: number) =>
    recordResult({ chosenId: id, isTimeout: false, isPass: false, timeMs }), [recordResult])

  const pass    = useCallback((timeMs?: number) =>
    recordResult({ chosenId: null, isTimeout: false, isPass: true, timeMs: timeMs ?? null }), [recordResult])

  const timeout = useCallback(() =>
    recordResult({ chosenId: null, isTimeout: true, isPass: false, timeMs: null }), [recordResult])

  const skipPlayerTransition = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'playing', currentPlayer: 1 as PlayerIndex, timerKey: prev.timerKey + 1 }))
  }, [])

  const skipRoundTransition = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'playing', currentPlayer: 0 as PlayerIndex, timerKey: prev.timerKey + 1 }))
  }, [])

  const restart = useCallback(() => {
    const cancelled = { value: false }
    loadGame(cancelled)
  }, [loadGame])

  return { ...state, isLoading, error, rounds, results, choose, pass, timeout, skipPlayerTransition, skipRoundTransition, restart }
}
