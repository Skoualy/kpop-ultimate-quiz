import { useCallback, useEffect, useRef, useState } from 'react'
import type { Group, Idol, GameConfig } from '@/shared/models'
import type { GamePhase, PlayerIndex, RoundData, SongItem } from '@/features/save-one/SaveOnePage.types'
import type { QuickVoteResult } from '../QuickVotePage.types'
import { buildIdolPool, buildRounds, buildSongPool } from '@/features/save-one/helpers/poolBuilder'
import { groupService } from '@/shared/services/groupService'
import { idolService } from '@/shared/services/idolService'
import {
  getSongSessionMemory,
  incrementSongSessionRound,
  updateSongMemoryAfterRound,
  type SongModeKey,
} from '@/features/save-one/helpers/songSessionMemory'

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Clé dédiée au Smash or Pass pour la rotation de chansons en session. */
const SONG_MODE_KEY: SongModeKey = 'quickVote-songs'

/**
 * Smash or Pass = toujours 1 item par round.
 * dropCount = 0 → buildRounds génère K = 0 + 1 = 1 item/round.
 */
const QUICK_VOTE_DROP_COUNT = 0

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameState {
  phase: GamePhase
  currentRoundIndex: number
  currentPlayer: PlayerIndex
  timerKey: number
}

export interface UseQuickVoteGameReturn extends GameState {
  isLoading: boolean
  error: string | null
  rounds: RoundData[]
  results: QuickVoteResult[]
  vote: (v: 'positive' | 'negative', timeMs: number) => void
  timeout: () => void
  skipPlayerTransition: () => void
  skipRoundTransition: () => void
  restart: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook principal du mode Smash or Pass.
 *
 * Calqué sur useSaveOneGame avec une seule différence structurelle :
 * `dropCount` est toujours 0 (1 item/round).
 * Les actions `choose`/`pass` sont remplacées par `vote('positive'|'negative')`.
 * Un timeout déclenche automatiquement un vote négatif.
 */
export function useQuickVoteGame(config: GameConfig): UseQuickVoteGameReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rounds, setRounds] = useState<RoundData[]>([])
  const [results, setResults] = useState<QuickVoteResult[]>([])
  const [state, setState] = useState<GameState>({
    phase: 'loading',
    currentRoundIndex: 0,
    currentPlayer: 0,
    timerKey: 0,
  })

  // Refs stables pour éviter les closures stale dans les callbacks
  const roundsRef = useRef<RoundData[]>([])
  const stateRef = useRef<GameState>(state)
  useEffect(() => {
    roundsRef.current = rounds
  }, [rounds])
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // ─── Chargement ────────────────────────────────────────────────────────────

  const loadGame = useCallback(
    async (cancelled: { value: boolean }) => {
      setIsLoading(true)
      setError(null)

      try {
        // Scope groupes — identique à Save One
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
            dropCount: QUICK_VOTE_DROP_COUNT, // ← toujours 0 → 1 item/round
            criterion: config.criterion,
            clipDuration: config.clipDuration,
          })
        } else {
          // Chansons — mémoire de session dédiée
          const songMemory = getSongSessionMemory(SONG_MODE_KEY)

          const pool = buildSongPool(groups, {
            songType: config.songType,
            clipDuration: config.clipDuration,
          })

          builtRounds = buildRounds(
            pool,
            {
              totalRounds: config.rounds,
              dropCount: QUICK_VOTE_DROP_COUNT,
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

  // ─── Mise à jour mémoire chansons ──────────────────────────────────────────

  const handleSongMemoryUpdate = useCallback(
    (roundIndex: number) => {
      if (config.category !== 'songs') return
      const round = roundsRef.current[roundIndex]
      if (!round) return

      incrementSongSessionRound(SONG_MODE_KEY)

      const songsInRound = (round.items as SongItem[]).map((song) => ({
        songId: song.songId,
        baseTimestamp: song.startTime,
      }))
      updateSongMemoryAfterRound(SONG_MODE_KEY, songsInRound)
    },
    [config.category],
  )

  // ─── Enregistrement du vote + transitions ──────────────────────────────────

  const recordVote = useCallback(
    (vote: 'positive' | 'negative', isTimeout: boolean, timeMs: number | null) => {
      const { currentRoundIndex, currentPlayer } = stateRef.current
      const isRoundComplete = !config.twoPlayerMode || currentPlayer === 1

      if (isRoundComplete) {
        handleSongMemoryUpdate(currentRoundIndex)
      }

      setResults((r) => [...r, { roundIndex: currentRoundIndex, playerIndex: currentPlayer, vote, isTimeout, timeMs }])

      setState((prev) => {
        const { currentRoundIndex: ri, currentPlayer: cp } = prev
        const totalRounds = roundsRef.current.length

        // Mode 2J — J1 vient de voter
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

  // ─── Actions publiques ─────────────────────────────────────────────────────

  /** Vote positif ou négatif avec temps de réaction. */
  const vote = useCallback((v: 'positive' | 'negative', timeMs: number) => recordVote(v, false, timeMs), [recordVote])

  /** Timeout = vote négatif automatique (conforme à la spec). */
  const timeout = useCallback(() => recordVote('negative', true, null), [recordVote])

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
    vote,
    timeout,
    skipPlayerTransition,
    skipRoundTransition,
    restart,
  }
}
