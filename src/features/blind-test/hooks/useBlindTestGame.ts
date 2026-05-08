import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameConfig, Group, Idol } from '@/shared/models'
import type {
  BlindTestResult,
  BlindTestRoundData,
  GamePhase,
  PlayerIndex,
  TurnState,
} from '../BlindTestPage.types'
import { initialTurnState } from '../BlindTestPage.types'
import {
  buildIdolPool,
  buildRounds,
  buildSongPool,
} from '@/features/save-one/helpers/poolBuilder'
import {
  getSongSessionMemory,
  updateSongMemoryAfterRound,
  type SongModeKey,
} from '@/features/save-one/helpers/songSessionMemory'
import { groupService } from '@/shared/services/groupService'
import { idolService } from '@/shared/services/idolService'
import { BLIND_TEST_MATCH_THRESHOLDS, GAME_PLAY_MODE_MAP } from '@/shared/constants'
import { isMatch } from '@/shared/utils/fuzzyMatch'
import type { SongItem, IdolItem } from '@/features/save-one/SaveOnePage.types'

const SONG_MODE_KEY: SongModeKey = 'blindTest-songs'

interface GameState {
  phase:             GamePhase
  currentRoundIndex: number
  currentPlayer:     PlayerIndex
  timerKey:          number
}

export interface UseBlindTestGameReturn {
  isLoading:            boolean
  error:                string | null
  phase:                GamePhase
  rounds:               BlindTestRoundData[]
  results:              BlindTestResult[]
  currentRoundIndex:    number
  currentPlayer:        PlayerIndex
  timerKey:             number
  turnState:            TurnState
  p1Score:              number
  p2Score:              number
  submitAnswer:         (input: string) => 'correct' | 'wrong'
  reveal:               () => void
  timeout:              () => void
  pass:                 () => void
  onClipEnd:            () => void
  skipPlayerTransition: () => void
  skipRoundTransition:  () => void
  restart:              () => void
}

export function useBlindTestGame(config: GameConfig): UseBlindTestGameReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [rounds, setRounds]       = useState<BlindTestRoundData[]>([])
  const [results, setResults]     = useState<BlindTestResult[]>([])
  const [state, setState]         = useState<GameState>({
    phase: 'loading', currentRoundIndex: 0, currentPlayer: 0, timerKey: 0,
  })
  const [turnState, setTurnState] = useState<TurnState>(initialTurnState())

  const roundsRef    = useRef<BlindTestRoundData[]>([])
  const stateRef     = useRef<GameState>(state)
  const turnStateRef = useRef<TurnState>(turnState)
  const advancingRef = useRef(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { roundsRef.current  = rounds    }, [rounds])
  useEffect(() => { stateRef.current   = state     }, [state])
  useEffect(() => { turnStateRef.current = turnState }, [turnState])

  const twoPlayer  = config.twoPlayerMode
  const isIdols    = config.category === 'idols'
  const isSongs    = config.category === 'songs'
  const modeConfig = GAME_PLAY_MODE_MAP[config.gamePlayMode]

  // ── Build rounds from pool ──────────────────────────────────────────────

  const loadGame = useCallback(async (cancelled: { value: boolean }) => {
    setIsLoading(true)
    setError(null)
    setResults([])
    setState({ phase: 'loading', currentRoundIndex: 0, currentPlayer: 0, timerKey: 0 })
    setTurnState(initialTurnState())
    advancingRef.current = false
    clearTimeout(advanceTimerRef.current)

    try {
      let groups: Group[]
      if (config.gamePlayMode === 'custom' && config.selectedGroupIds.length > 0) {
        const all = await groupService.getAll()
        groups = all.filter((g) => config.selectedGroupIds.includes(g.id))
      } else {
        groups = await groupService.getAll()
      }
      if (cancelled.value) return

      // K = items per round: 1 solo, 2 in two-player (one song/idol per player)
      const dropCount = twoPlayer ? 1 : 0

      let builtRounds: BlindTestRoundData[]

      if (isIdols) {
        const allIdols: Idol[] = await idolService.getAll()
        if (cancelled.value) return
        const pool = buildIdolPool(groups, allIdols, {
          roleFilters: config.roleFilters,
          criterion:   config.criterion,
        })
        const rawRounds = buildRounds(pool, {
          totalRounds:  config.rounds,
          dropCount,
          criterion:    config.criterion,
          clipDuration: config.clipDuration,
        })
        builtRounds = rawRounds.map((r) => ({
          roundNumber: r.roundNumber,
          song1: null,
          song2: null,
          idol1: (r.items[0] as IdolItem) ?? null,
          idol2: twoPlayer ? ((r.items[1] as IdolItem) ?? null) : null,
        }))
      } else {
        const songMemory = getSongSessionMemory(SONG_MODE_KEY)
        const pool = buildSongPool(groups, {
          songType:     config.songType,
          clipDuration: config.clipDuration,
          songLanguage: config.songLanguage,
        })
        const rawRounds = buildRounds(
          pool,
          { totalRounds: config.rounds, dropCount, criterion: config.criterion, clipDuration: config.clipDuration },
          songMemory,
          SONG_MODE_KEY,
        )
        builtRounds = rawRounds.map((r) => ({
          roundNumber: r.roundNumber,
          song1: (r.items[0] as SongItem) ?? null,
          song2: twoPlayer ? ((r.items[1] as SongItem) ?? null) : null,
          idol1: null,
          idol2: null,
        }))
      }

      if (cancelled.value) return

      roundsRef.current = builtRounds
      setRounds(builtRounds)
      setIsLoading(false)
      setState({ phase: 'roundTransition', currentRoundIndex: 0, currentPlayer: 0, timerKey: 0 })
    } catch (err) {
      if (!cancelled.value) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setIsLoading(false)
      }
    }
  }, [config, twoPlayer, isIdols])

  useEffect(() => {
    const cancelled = { value: false }
    loadGame(cancelled)
    return () => { cancelled.value = true }
  }, [loadGame])

  // ── Advance logic ───────────────────────────────────────────────────────

  const advanceToNext = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true
    clearTimeout(advanceTimerRef.current)

    const s = stateRef.current

    if (twoPlayer && s.currentPlayer === 0) {
      // Switch to J2 via player transition overlay
      setState((prev) => ({ ...prev, phase: 'playerTransition' }))
    } else {
      const nextIndex = s.currentRoundIndex + 1
      if (nextIndex < roundsRef.current.length) {
        setState((prev) => ({
          ...prev,
          phase:             'roundTransition',
          currentRoundIndex: nextIndex,
          currentPlayer:     0,
        }))
      } else {
        setState((prev) => ({ ...prev, phase: 'summary' }))
      }
    }
  }, [twoPlayer])

  // For idols: advance automatically after clipDuration seconds post-reveal
  const triggerAdvanceAfterReveal = useCallback(() => {
    if (isIdols) {
      advanceTimerRef.current = setTimeout(() => advanceToNext(), config.clipDuration * 1000)
    }
    // For songs: advance is triggered by onClipEnd callback
  }, [isIdols, config.clipDuration, advanceToNext])

  // ── Result recording ────────────────────────────────────────────────────

  const recordResult = useCallback(
    (ts: TurnState, isTimeout: boolean, isRevealed: boolean) => {
      const s = stateRef.current
      const timeMs = ts.artistMatched && ts.titleMatched ? Date.now() - ts.startTime : null
      const result: BlindTestResult = {
        roundIndex:    s.currentRoundIndex,
        playerIndex:   s.currentPlayer,
        artistMatched: ts.artistMatched,
        titleMatched:  ts.titleMatched,
        foundInOneTry: ts.foundInOneTry,
        timeMs,
        scoreGained:   ts.scoreGained,
        isTimeout,
        isRevealed,
      }
      setResults((prev) => [...prev, result])

      // Update song session memory after the round
      if (isSongs) {
        const round = roundsRef.current[s.currentRoundIndex]
        const songs: Array<{ songId: string; baseTimestamp: number }> = []
        if (round.song1) songs.push({ songId: round.song1.songId, baseTimestamp: round.song1.startTime })
        if (round.song2) songs.push({ songId: round.song2.songId, baseTimestamp: round.song2.startTime })
        if (songs.length > 0) updateSongMemoryAfterRound(SONG_MODE_KEY, songs)
      }
    },
    [isSongs],
  )

  // ── Active item helpers ─────────────────────────────────────────────────

  function getCurrentItem(): SongItem | IdolItem | null {
    const s = stateRef.current
    const round = roundsRef.current[s.currentRoundIndex]
    if (!round) return null
    if (isIdols) return s.currentPlayer === 0 ? round.idol1 : round.idol2
    return s.currentPlayer === 0 ? round.song1 : round.song2
  }

  function getMatchFields(item: SongItem | IdolItem) {
    if (item.type === 'song') return { artistField: item.groupName, titleField: item.title }
    return { artistField: item.groupName, titleField: item.name }
  }

  // ── Game actions ────────────────────────────────────────────────────────

  const submitAnswer = useCallback((input: string): 'correct' | 'wrong' => {
    const ts = turnStateRef.current
    if (ts.isRevealed) return 'wrong'

    const item = getCurrentItem()
    if (!item) return 'wrong'

    const threshold = BLIND_TEST_MATCH_THRESHOLDS[config.answerTolerance ?? 'tolerant']
    const { artistField, titleField } = getMatchFields(item)

    const artistOk = !ts.artistMatched && isMatch(input, artistField, threshold)
    const titleOk  = !ts.titleMatched  && isMatch(input, titleField, threshold)

    if (!artistOk && !titleOk) return 'wrong'

    const multiplier = modeConfig.xpMultiplier
    let newArtist      = ts.artistMatched || artistOk
    let newTitle       = ts.titleMatched  || titleOk
    let newFoundInOne  = ts.foundInOneTry
    let newScore       = ts.scoreGained

    if (artistOk && titleOk) {
      // Both found in one keystroke → 3 pts
      newFoundInOne = true
      newScore      = Math.round(3 * multiplier)
    } else {
      newScore += Math.round(1 * multiplier)
    }

    const turnComplete = newArtist && newTitle
    const newTs: TurnState = {
      ...ts,
      artistMatched: newArtist,
      titleMatched:  newTitle,
      foundInOneTry: newFoundInOne,
      scoreGained:   newScore,
      isRevealed:    turnComplete,
    }
    setTurnState(newTs)

    if (turnComplete) {
      recordResult(newTs, false, false)
      triggerAdvanceAfterReveal()
    }

    return 'correct'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.answerTolerance, modeConfig.xpMultiplier, recordResult, triggerAdvanceAfterReveal])

  const reveal = useCallback(() => {
    const ts = turnStateRef.current
    if (ts.isRevealed) return
    const newTs: TurnState = { ...ts, isRevealed: true }
    setTurnState(newTs)
    recordResult(newTs, false, true)
    triggerAdvanceAfterReveal()
  }, [recordResult, triggerAdvanceAfterReveal])

  const timeout = useCallback(() => {
    const ts = turnStateRef.current
    if (ts.isRevealed) return
    const newTs: TurnState = { ...ts, isRevealed: true }
    setTurnState(newTs)
    recordResult(newTs, true, false)
    triggerAdvanceAfterReveal()
  }, [recordResult, triggerAdvanceAfterReveal])

  const pass = useCallback(() => {
    const ts = turnStateRef.current
    if (!ts.isRevealed) {
      // Reveal first (0 pts for missing fields), then wait for clip/timer
      reveal()
    } else {
      // Skip remaining clip time → advance immediately
      advanceToNext()
    }
  }, [reveal, advanceToNext])

  // For songs mode: called when YouTube clip ends
  const onClipEnd = useCallback(() => {
    if (isSongs && turnStateRef.current.isRevealed) {
      advanceToNext()
    }
  }, [isSongs, advanceToNext])

  const skipPlayerTransition = useCallback(() => {
    advancingRef.current = false
    setTurnState(initialTurnState())
    setState((prev) => ({ ...prev, phase: 'playing', currentPlayer: 1, timerKey: prev.timerKey + 1 }))
  }, [])

  const skipRoundTransition = useCallback(() => {
    advancingRef.current = false
    setTurnState(initialTurnState())
    setState((prev) => ({ ...prev, phase: 'playing', currentPlayer: 0, timerKey: prev.timerKey + 1 }))
  }, [])

  const restart = useCallback(() => {
    const cancelled = { value: false }
    loadGame(cancelled)
  }, [loadGame])

  // ── Derived scores ──────────────────────────────────────────────────────

  const p1Score = results.filter((r) => r.playerIndex === 0).reduce((s, r) => s + r.scoreGained, 0)
  const p2Score = results.filter((r) => r.playerIndex === 1).reduce((s, r) => s + r.scoreGained, 0)

  return {
    isLoading,
    error,
    phase:             state.phase,
    rounds,
    results,
    currentRoundIndex: state.currentRoundIndex,
    currentPlayer:     state.currentPlayer,
    timerKey:          state.timerKey,
    turnState,
    p1Score,
    p2Score,
    submitAnswer,
    reveal,
    timeout,
    pass,
    onClipEnd,
    skipPlayerTransition,
    skipRoundTransition,
    restart,
  }
}
