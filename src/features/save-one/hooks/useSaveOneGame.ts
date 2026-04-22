import { useCallback, useEffect, useRef, useState } from 'react'
import type { Group, Idol } from '@/shared/models'
import type { GameConfig } from '@/shared/models'
import type { GamePhase, PlayerIndex, RoundData, RoundResult, SongItem } from '../SaveOnePage.types'
import { buildIdolPool, buildRounds, buildSongPool } from '../helpers/poolBuilder'
import { groupService } from '@/shared/services/groupService'
import { idolService } from '@/shared/services/idolService'
import {
  getSongSessionMemory,
  incrementSongSessionRound,
  updateSongMemoryAfterRound,
  type SongModeKey,
} from '../helpers/songSessionMemory'

// ─── Types ────────────────────────────────────────────────────────────────────

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

const SONG_MODE_KEY: SongModeKey = 'saveOne-songs'

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSaveOneGame(config: GameConfig): UseSaveOneGameReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [results, setResults] = useState<RoundResult[]>([])
  const [state, setState] = useState<GameState>({
    phase: 'loading',
    currentRoundIndex: 0,
    currentPlayer: 0,
    timerKey: 0,
  })

  const roundsRef = useRef<RoundData[]>([])
  const stateRef = useRef<GameState>(state)

  useEffect(() => {
    roundsRef.current = rounds
  }, [rounds])
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // ─── Chargement ──────────────────────────────────────────────────────────

  const loadGame = useCallback(
    async (cancelled: { value: boolean }) => {
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

        let builtRounds: RoundData[]

        if (config.category === 'idols') {
          const allIdols: Idol[] = await idolService.getAll()
          if (cancelled.value) return

          const pool = buildIdolPool(groups, allIdols, {
            roleFilters: config.roleFilters,
            criterion: config.criterion,
          })

          builtRounds = buildRounds(pool, {
            totalRounds: config.rounds,
            dropCount: config.drops,
            criterion: config.criterion,
            clipDuration: config.clipDuration,
          })
        } else {
          // Lire la mémoire avant la construction des rounds
          // (poids calculés depuis les parties précédentes de la session)
          const songMemory = getSongSessionMemory(SONG_MODE_KEY)

          const pool = buildSongPool(groups, {
            songType: config.songType,
            clipDuration: config.clipDuration,
          })

          builtRounds = buildRounds(
            pool,
            {
              totalRounds: config.rounds,
              dropCount: config.drops,
              criterion: config.criterion,
              clipDuration: config.clipDuration,
            },
            songMemory,
            SONG_MODE_KEY,
          )
        }

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
    },
    [config],
  )

  useEffect(() => {
    const cancelled = { value: false }
    loadGame(cancelled)
    return () => {
      cancelled.value = true
    }
  }, [loadGame])

  // ─── Mise à jour mémoire chansons ────────────────────────────────────────
  //
  // Appelée HORS du callback setState pour éviter les effets de bord React.
  // Utilise stateRef pour lire l'état courant sans dépendances circulaires.

  const handleSongMemoryUpdate = useCallback(
    (roundIndex: number) => {
      if (config.category !== 'songs') return
      const round = roundsRef.current[roundIndex]
      if (!round) return

      // Incrémenter le compteur session PUIS enregistrer les chansons
      incrementSongSessionRound(SONG_MODE_KEY)

      const songsInRound = (round.items as SongItem[]).map((song) => ({
        songId: song.songId,
        baseTimestamp: song.startTime, // déjà canonique (60 | 90 | 120) depuis poolBuilder
      }))

      updateSongMemoryAfterRound(SONG_MODE_KEY, songsInRound)
    },
    [config.category],
  )

  // ─── Enregistrement + transitions ────────────────────────────────────────

  const recordResult = useCallback(
    (result: Omit<RoundResult, 'roundIndex' | 'playerIndex'>) => {
      // Lire l'état courant depuis le ref (pas de closure stale)
      const { currentRoundIndex, currentPlayer } = stateRef.current
      const isRoundComplete = !config.twoPlayerMode || currentPlayer === 1

      // Mise à jour mémoire chansons AVANT setState (side effect synchrone, sessionStorage)
      if (isRoundComplete) {
        handleSongMemoryUpdate(currentRoundIndex)
      }

      setResults((r) => [...r, { ...result, roundIndex: currentRoundIndex, playerIndex: currentPlayer }])

      setState((prev) => {
        const { currentRoundIndex: ri, currentPlayer: cp } = prev
        const totalRounds = roundsRef.current.length

        // Mode 2J — J1 vient de jouer
        if (config.twoPlayerMode && cp === 0) {
          return { ...prev, phase: 'playerTransition', timerKey: prev.timerKey + 1 }
        }

        const nextIndex = ri + 1
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
    [config.twoPlayerMode, handleSongMemoryUpdate],
  )

  const choose = useCallback(
    (id: string, timeMs: number) => recordResult({ chosenId: id, isTimeout: false, isPass: false, timeMs }),
    [recordResult],
  )

  const pass = useCallback(
    (timeMs?: number) => recordResult({ chosenId: null, isTimeout: false, isPass: true, timeMs: timeMs ?? null }),
    [recordResult],
  )

  const timeout = useCallback(
    () => recordResult({ chosenId: null, isTimeout: true, isPass: false, timeMs: null }),
    [recordResult],
  )

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

  return {
    ...state,
    isLoading,
    error,
    rounds,
    results,
    choose,
    pass,
    timeout,
    skipPlayerTransition,
    skipRoundTransition,
    restart,
  }
}
