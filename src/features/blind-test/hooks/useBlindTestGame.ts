import { useCallback, useEffect, useRef, useState } from 'react'
import type { Group, GameConfig } from '@/shared/models'
import type {
  GamePhase,
  PlayerIndex,
  BlindTestRoundData,
  BlindTestResult,
  TurnState,
} from '../BlindTestPage.types'
import type { SongItem } from '@/features/save-one/SaveOnePage.types'
import { buildSongPool, buildRounds } from '@/features/save-one/helpers/poolBuilder'
import { groupService } from '@/shared/services/groupService'
import {
  getSongSessionMemory,
  incrementSongSessionRound,
  updateSongMemoryAfterRound,
  type SongModeKey,
} from '@/features/save-one/helpers/songSessionMemory'
import { isMatch } from '@/shared/utils/fuzzyMatch'
import { BLIND_TEST_MATCH_THRESHOLDS } from '@/shared/constants'

const SONG_MODE_KEY: SongModeKey = 'blindTest-songs'

interface GameState {
  phase:             GamePhase
  currentRoundIndex: number
  currentPlayer:     PlayerIndex
  timerKey:          number
}

const EMPTY_TURN: TurnState = {
  artistMatched: false,
  titleMatched:  false,
  foundInOneTry: false,
  startTime:     0,
  isRevealed:    false,
}

function computeScore(artistMatched: boolean, titleMatched: boolean, foundInOneTry: boolean): number {
  if (foundInOneTry) return 3
  return (artistMatched ? 1 : 0) + (titleMatched ? 1 : 0)
}

export interface UseBlindTestGameReturn extends GameState {
  isLoading:            boolean
  error:                string | null
  rounds:               BlindTestRoundData[]
  results:              BlindTestResult[]
  turnState:            TurnState
  submitAnswer:         (input: string) => 'correct' | 'wrong'
  reveal:               () => void
  pass:                 () => void
  timeout:              () => void
  onClipEnd:            () => void
  skipPlayerTransition: () => void
  skipRoundTransition:  () => void
  restart:              () => void
}

export function useBlindTestGame(config: GameConfig): UseBlindTestGameReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [rounds,    setRounds]    = useState<BlindTestRoundData[]>([])
  const [results,   setResults]   = useState<BlindTestResult[]>([])
  const [state,     setState]     = useState<GameState>({
    phase:             'loading',
    currentRoundIndex: 0,
    currentPlayer:     0,
    timerKey:          0,
  })
  const [turnState, setTurnState] = useState<TurnState>({ ...EMPTY_TURN, startTime: Date.now() })

  const roundsRef   = useRef<BlindTestRoundData[]>([])
  const stateRef    = useRef<GameState>(state)
  const turnRef     = useRef<TurnState>(turnState)
  const advancingRef = useRef(false) // garde-fou contre double-avancement

  useEffect(() => { roundsRef.current = rounds   }, [rounds])
  useEffect(() => { stateRef.current  = state    }, [state])
  useEffect(() => { turnRef.current   = turnState }, [turnState])

  // ─── Chargement ────────────────────────────────────────────────────────────

  const loadGame = useCallback(async (cancelled: { value: boolean }) => {
    setIsLoading(true)
    setError(null)
    setResults([])

    try {
      let groups: Group[]
      if (config.gamePlayMode === 'custom' && config.selectedGroupIds.length > 0) {
        const all = await groupService.getAll()
        groups = all.filter((g) => config.selectedGroupIds.includes(g.id))
      } else {
        groups = await groupService.getAll()
      }
      if (cancelled.value) return

      const songMemory = getSongSessionMemory(SONG_MODE_KEY)

      // Utilise buildRounds avec K = 1 (solo) ou K = 2 (2J)
      const pool = buildSongPool(groups, {
        songType:     config.songType,
        clipDuration: config.clipDuration,
        songLanguage: config.songLanguage,
      })

      const dropCount = config.twoPlayerMode ? 1 : 0
      const rawRounds = buildRounds(
        pool,
        {
          totalRounds:  config.rounds,
          dropCount,
          criterion:    config.criterion,
          clipDuration: config.clipDuration,
        },
        songMemory,
        SONG_MODE_KEY,
      )

      // Convertit les RoundData → BlindTestRoundData
      const blindRounds: BlindTestRoundData[] = rawRounds.map((rd) => {
        const songs = rd.items as SongItem[]
        return {
          roundNumber: rd.roundNumber,
          song1: songs[0],
          song2: config.twoPlayerMode ? (songs[1] ?? null) : null,
        }
      })

      if (cancelled.value) return

      setRounds(blindRounds)
      setState({
        phase:             blindRounds.length === 0 ? 'summary' : 'roundTransition',
        currentRoundIndex: 0,
        currentPlayer:     0,
        timerKey:          0,
      })
      setTurnState({ ...EMPTY_TURN, startTime: Date.now() })
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

  // ─── Mise à jour mémoire chansons ──────────────────────────────────────────

  const handleSongMemoryUpdate = useCallback((roundIndex: number, playerIndex: PlayerIndex) => {
    const round = roundsRef.current[roundIndex]
    if (!round) return
    const song = playerIndex === 0 ? round.song1 : round.song2
    if (!song) return
    incrementSongSessionRound(SONG_MODE_KEY)
    updateSongMemoryAfterRound(SONG_MODE_KEY, [{ songId: song.songId, baseTimestamp: song.startTime }])
  }, [])

  // ─── Avancement au tour / round suivant ────────────────────────────────────

  const advanceToNext = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true

    const { currentRoundIndex, currentPlayer } = stateRef.current
    const totalRounds = roundsRef.current.length

    handleSongMemoryUpdate(currentRoundIndex, currentPlayer)

    const resetTurn = () => {
      setTurnState({ ...EMPTY_TURN, startTime: Date.now() })
      advancingRef.current = false
    }

    if (config.twoPlayerMode && currentPlayer === 0) {
      setState((prev) => ({ ...prev, phase: 'playerTransition', timerKey: prev.timerKey + 1 }))
      resetTurn()
      return
    }

    const nextIndex = currentRoundIndex + 1
    if (nextIndex >= totalRounds) {
      setState((prev) => ({ ...prev, phase: 'summary' }))
    } else {
      setState((prev) => ({
        ...prev,
        phase:             'roundTransition',
        currentRoundIndex: nextIndex,
        currentPlayer:     0 as PlayerIndex,
        timerKey:          prev.timerKey + 1,
      }))
    }
    resetTurn()
  }, [config.twoPlayerMode, handleSongMemoryUpdate])

  // ─── Enregistrement d'un résultat ──────────────────────────────────────────

  const recordResult = useCallback((turn: TurnState, isTimeout: boolean, isRevealed: boolean) => {
    const { currentRoundIndex, currentPlayer } = stateRef.current
    const elapsed = Date.now() - turn.startTime
    const score   = computeScore(turn.artistMatched, turn.titleMatched, turn.foundInOneTry)

    setResults((prev) => [
      ...prev,
      {
        roundIndex:    currentRoundIndex,
        playerIndex:   currentPlayer,
        artistMatched: turn.artistMatched,
        titleMatched:  turn.titleMatched,
        foundInOneTry: turn.foundInOneTry,
        timeMs:        turn.artistMatched || turn.titleMatched ? elapsed : null,
        scoreGained:   score,
        isTimeout,
        isRevealed,
      },
    ])
  }, [])

  // ─── submitAnswer ──────────────────────────────────────────────────────────

  const submitAnswer = useCallback((input: string): 'correct' | 'wrong' => {
    const turn = turnRef.current
    if (turn.isRevealed) return 'wrong'

    const { currentRoundIndex, currentPlayer } = stateRef.current
    const round = roundsRef.current[currentRoundIndex]
    if (!round) return 'wrong'

    const song = currentPlayer === 0 ? round.song1 : (round.song2 ?? round.song1)
    const threshold = BLIND_TEST_MATCH_THRESHOLDS[config.answerTolerance]

    const artistHit = !turn.artistMatched && isMatch(input, song.groupName, threshold)
    const titleHit  = !turn.titleMatched  && isMatch(input, song.title,     threshold)

    if (!artistHit && !titleHit) return 'wrong'

    const bothNow       = (turn.artistMatched || artistHit) && (turn.titleMatched || titleHit)
    const foundInOneTry = !turn.artistMatched && !turn.titleMatched && artistHit && titleHit

    const next: TurnState = {
      ...turn,
      artistMatched: turn.artistMatched || artistHit,
      titleMatched:  turn.titleMatched  || titleHit,
      foundInOneTry: turn.foundInOneTry || foundInOneTry,
    }

    setTurnState(next)
    turnRef.current = next

    if (bothNow) {
      recordResult(next, false, false)
      advanceToNext()
    }

    return 'correct'
  }, [config.answerTolerance, recordResult, advanceToNext])

  // ─── Révélation (bouton Révéler ou passage post-réponse) ───────────────────

  const revealCurrent = useCallback((isTimeout: boolean) => {
    const turn = turnRef.current
    if (turn.isRevealed) return

    const next = { ...turn, isRevealed: true }
    setTurnState(next)
    turnRef.current = next

    recordResult(next, isTimeout, !isTimeout)
  }, [recordResult])

  const reveal = useCallback(() => revealCurrent(false), [revealCurrent])

  const timeout = useCallback(() => revealCurrent(true), [revealCurrent])

  // ─── pass ──────────────────────────────────────────────────────────────────

  const pass = useCallback(() => {
    if (!turnRef.current.isRevealed) {
      revealCurrent(false)
    } else {
      advanceToNext()
    }
  }, [revealCurrent, advanceToNext])

  // ─── onClipEnd — avance automatiquement après le clip post-révélation ──────

  const onClipEnd = useCallback(() => {
    if (turnRef.current.isRevealed) {
      advanceToNext()
    }
  }, [advanceToNext])

  // ─── Transitions ───────────────────────────────────────────────────────────

  const skipPlayerTransition = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase:         'playing',
      currentPlayer: 1 as PlayerIndex,
      timerKey:      prev.timerKey + 1,
    }))
    setTurnState({ ...EMPTY_TURN, startTime: Date.now() })
  }, [])

  const skipRoundTransition = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'playing', timerKey: prev.timerKey + 1 }))
    setTurnState({ ...EMPTY_TURN, startTime: Date.now() })
  }, [])

  const restart = useCallback(() => {
    advancingRef.current = false
    const c = { value: false }
    loadGame(c)
  }, [loadGame])

  return {
    ...state,
    isLoading,
    error,
    rounds,
    results,
    turnState,
    submitAnswer,
    reveal,
    pass,
    timeout,
    onClipEnd,
    skipPlayerTransition,
    skipRoundTransition,
    restart,
  }
}
