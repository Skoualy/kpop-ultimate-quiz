import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { useIdolList } from '@/shared/hooks/useIdolList'
import { LoadingSpinner } from '@/shared/Components/LoadingSpinner'
import { extractYoutubeId } from '@/shared/utils/youtube'
import { buildIdolPool, buildSongPool, generateSaveOneRounds } from './saveOneEngine'
import type {
  IdolPoolEntry,
  PlayerRoundResult,
  SaveOneRound,
  SaveOneRoundChoice,
  SaveOneRoundResult,
  SongPoolEntry,
} from './saveOne.types'
import styles from './SaveOnePage.module.scss'

type PagePhase = 'loading' | 'round' | 'playerTransition' | 'roundTransition' | 'summary'

function getClipEmbedUrl(youtubeUrl: string, startAt: number, autoplay: boolean): string {
  const id = extractYoutubeId(youtubeUrl)
  if (!id) return ''

  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    start: String(startAt),
    controls: '0',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '0',
    disablekb: '1',
    playsinline: '1',
  })

  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export default function SaveOnePage() {
  const navigate = useNavigate()
  const { config } = useGameContext()
  const { data: allGroups, loading: groupsLoading } = useGroupList()
  const { data: allIdols, loading: idolsLoading } = useIdolList()

  const selectedGroups = useMemo(() => {
    if (!allGroups) return []
    const selectedSet = new Set(config.selectedGroupIds)
    return allGroups.filter((group) => selectedSet.has(group.id))
  }, [allGroups, config.selectedGroupIds])

  const rounds = useMemo<SaveOneRound[]>(() => {
    const choicesPerRound = config.drops + 1

    if (config.category === 'idols') {
      if (!allIdols || selectedGroups.length === 0) return []
      const idolPool = buildIdolPool({
        groups: selectedGroups,
        idols: allIdols,
        roleFilters: config.roleFilters,
      })

      return generateSaveOneRounds<IdolPoolEntry>({
        basePool: idolPool,
        rounds: config.rounds,
        choicesPerRound,
      })
    }

    if (selectedGroups.length === 0) return []
    const songPool = buildSongPool({
      groups: selectedGroups,
      songType: config.songType,
      clipDuration: config.clipDuration,
    })

    return generateSaveOneRounds<SongPoolEntry>({
      basePool: songPool,
      rounds: config.rounds,
      choicesPerRound,
    })
  }, [allIdols, selectedGroups, config.category, config.clipDuration, config.drops, config.roleFilters, config.rounds, config.songType])

  const [phase, setPhase] = useState<PagePhase>('loading')
  const [roundIndex, setRoundIndex] = useState(0)
  const [playerIndex, setPlayerIndex] = useState(0)
  const [timerLeft, setTimerLeft] = useState(config.timerSeconds)
  const [playerTransitionCountdown, setPlayerTransitionCountdown] = useState(2)
  const [results, setResults] = useState<SaveOneRoundResult[]>([])

  const [songPlaybackReady, setSongPlaybackReady] = useState(config.category === 'idols')
  const [songRevealed, setSongRevealed] = useState<boolean[]>([])
  const [songPlaybackIndex, setSongPlaybackIndex] = useState(0)
  const [songEmbedUrl, setSongEmbedUrl] = useState('')

  const timerStartRef = useRef<number | null>(null)
  const hasSubmittedRef = useRef(false)

  const isLoading = groupsLoading || (config.category === 'idols' && idolsLoading)
  const currentRound = rounds[roundIndex]
  const playerNames = config.twoPlayerMode
    ? [config.player1Name || 'Joueur 1', config.player2Name || 'Joueur 2']
    : [config.player1Name || 'Joueur 1']

  const isSongs = config.category === 'songs'

  useEffect(() => {
    if (isLoading) {
      setPhase('loading')
      return
    }
    setPhase(rounds.length > 0 ? 'round' : 'summary')
  }, [isLoading, rounds.length])

  useEffect(() => {
    if (phase !== 'round' || !currentRound) return

    hasSubmittedRef.current = false

    if (!isSongs) {
      setSongPlaybackReady(true)
      setSongEmbedUrl('')
      setSongRevealed([])
      return
    }

    const initialRevealed = currentRound.choices.map((_, index) => index === 0)
    const isSecondPlayerInTwoPlayer = config.twoPlayerMode && playerIndex === 1

    if (isSecondPlayerInTwoPlayer) {
      setSongRevealed(currentRound.choices.map(() => true))
      setSongPlaybackReady(true)
      setSongEmbedUrl('')
      return
    }

    setSongRevealed(initialRevealed)
    setSongPlaybackReady(false)
    setSongPlaybackIndex(0)
  }, [phase, currentRound, isSongs, config.twoPlayerMode, playerIndex])

  useEffect(() => {
    if (!isSongs || phase !== 'round' || !currentRound || songPlaybackReady) return

    const songChoices = currentRound.choices as SongPoolEntry[]
    if (songPlaybackIndex >= songChoices.length) {
      setSongRevealed(songChoices.map(() => true))
      setSongPlaybackReady(true)
      setSongEmbedUrl('')
      return
    }

    const currentSong = songChoices[songPlaybackIndex]
    if (!currentSong.youtubeId) {
      setSongRevealed((prev) => prev.map((value, idx) => (idx === songPlaybackIndex ? true : value)))
      setSongPlaybackIndex((prev) => prev + 1)
      return
    }

    setSongEmbedUrl(getClipEmbedUrl(currentSong.song.youtubeUrl, currentSong.previewStartSeconds, true))
    const revealTimeout = window.setTimeout(() => {
      setSongRevealed((prev) => prev.map((value, idx) => (idx <= songPlaybackIndex + 1 ? true : value)))
      setSongPlaybackIndex((prev) => prev + 1)
    }, config.clipDuration * 1000)

    return () => window.clearTimeout(revealTimeout)
  }, [config.clipDuration, currentRound, isSongs, phase, songPlaybackIndex, songPlaybackReady])

  useEffect(() => {
    if (phase !== 'round') return

    const canRunTimer = config.timerSeconds > 0 && (!isSongs || songPlaybackReady)
    if (!canRunTimer) {
      setTimerLeft(config.timerSeconds)
      timerStartRef.current = null
      return
    }

    setTimerLeft(config.timerSeconds)
    timerStartRef.current = Date.now()

    const interval = window.setInterval(() => {
      setTimerLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval)
          if (!hasSubmittedRef.current) {
            submitChoice(null, true)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [config.timerSeconds, isSongs, phase, songPlaybackReady])

  const proceedToNext = useCallback(() => {
    if (config.twoPlayerMode && playerIndex === 0) {
      setPhase('playerTransition')
      setPlayerTransitionCountdown(2)
      return
    }

    setPhase('roundTransition')
    window.setTimeout(() => {
      if (roundIndex + 1 >= rounds.length) {
        setPhase('summary')
        return
      }

      setRoundIndex((prev) => prev + 1)
      setPlayerIndex(0)
      setPhase('round')
    }, 650)
  }, [config.twoPlayerMode, playerIndex, roundIndex, rounds.length])

  const submitChoice = useCallback((choice: SaveOneRoundChoice | null, timeout: boolean) => {
    if (!currentRound || hasSubmittedRef.current) return

    hasSubmittedRef.current = true
    const decisionMs = timerStartRef.current ? Date.now() - timerStartRef.current : null

    setResults((prev) => {
      const next = [...prev]
      const existingRound = next.find((entry) => entry.roundIndex === currentRound.index)
      const playerResult: PlayerRoundResult = {
        choiceId: choice?.id ?? null,
        choiceLabel: choice
          ? ('idol' in choice ? choice.idol.name : choice.song.title)
          : timeout
            ? 'Timeout'
            : 'Pass',
        groupName: choice?.groupName ?? null,
        timeout,
        decisionMs,
      }

      if (existingRound) {
        existingRound.players[playerIndex] = playerResult
      } else {
        next.push({
          roundIndex: currentRound.index,
          players: playerIndex === 0 ? [playerResult] : [
            { choiceId: null, choiceLabel: 'Pass', groupName: null, timeout: false, decisionMs: null },
            playerResult,
          ],
        })
      }

      return next
    })

    proceedToNext()
  }, [currentRound, playerIndex, proceedToNext])

  useEffect(() => {
    if (phase !== 'playerTransition') return

    const interval = window.setInterval(() => {
      setPlayerTransitionCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval)
          setPlayerIndex(1)
          setPhase('round')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [phase])

  function skipPlayerTransition() {
    if (phase !== 'playerTransition') return
    setPlayerIndex(1)
    setPhase('round')
  }

  function handleReplay(choice: SongPoolEntry) {
    if (!songPlaybackReady || !choice.youtubeId) return
    setSongEmbedUrl(getClipEmbedUrl(choice.song.youtubeUrl, choice.previewStartSeconds, true))
  }

  const canPick = phase === 'round' && (!isSongs || songPlaybackReady)

  const fastestChoice = useMemo(() => {
    const allDecisions = results.flatMap((round) => round.players).filter((entry) => entry.decisionMs !== null)
    if (allDecisions.length === 0) return null
    return allDecisions.reduce((best, current) =>
      (current.decisionMs ?? Number.MAX_SAFE_INTEGER) < (best.decisionMs ?? Number.MAX_SAFE_INTEGER) ? current : best,
    )
  }, [results])

  const topGroups = useMemo(() => {
    const counts = new Map<string, { groupName: string; count: number }>()
    results.forEach((round) => {
      round.players.forEach((player) => {
        if (!player.groupName) return
        const current = counts.get(player.groupName)
        if (current) {
          current.count += 1
        } else {
          counts.set(player.groupName, { groupName: player.groupName, count: 1 })
        }
      })
    })

    const ranked = Array.from(counts.values()).sort((a, b) => b.count - a.count)
    const meaningful = ranked.some((entry) => entry.count > 1)
    return meaningful ? ranked.slice(0, 3) : []
  }, [results])

  if (isLoading || phase === 'loading') {
    return (
      <div className={styles.centered}>
        <LoadingSpinner label="Préparation des rounds Save One..." />
      </div>
    )
  }

  if (phase === 'summary') {
    return (
      <div className={styles.page}>
        <div className={styles.summaryHeader}>
          <h1>Save One · Résumé</h1>
          <button className="btn btn--secondary" onClick={() => navigate('/')}>Retour config</button>
        </div>

        {config.twoPlayerMode ? (
          <div className={styles.summaryGrid}>
            {results.map((round) => {
              const p1 = round.players[0]
              const p2 = round.players[1]
              const isMatch = p1?.choiceId && p1.choiceId === p2?.choiceId
              return (
                <div key={round.roundIndex} className={[styles.summaryRound, isMatch ? styles.matchRound : ''].join(' ')}>
                  <strong>Round {round.roundIndex + 1}</strong>
                  <div>{playerNames[0]}: {p1?.choiceLabel ?? 'Pass'}</div>
                  <div>{playerNames[1]}: {p2?.choiceLabel ?? 'Pass'}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={styles.summaryGrid}>
            {results.map((round) => {
              const solo = round.players[0]
              return (
                <div key={round.roundIndex} className={styles.summaryRound}>
                  <strong>Round {round.roundIndex + 1}</strong>
                  <div>{solo?.choiceLabel ?? 'Pass'}</div>
                </div>
              )
            })}
          </div>
        )}

        <div className={styles.summaryMeta}>
          <div>
            <strong>Fastest choice:</strong>{' '}
            {fastestChoice?.decisionMs !== null && fastestChoice
              ? `${fastestChoice.choiceLabel} (${formatMs(fastestChoice.decisionMs ?? 0)})`
              : 'N/A'}
          </div>
          {topGroups.length > 0 && (
            <div>
              <strong>Top groups:</strong> {topGroups.map((entry) => `${entry.groupName} (${entry.count})`).join(' · ')}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!currentRound) {
    return (
      <div className={styles.centered}>
        <p>Aucun round disponible. Vérifie ta sélection de groupes.</p>
        <button className="btn btn--secondary" onClick={() => navigate('/')}>Retour config</button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {phase === 'playerTransition' && (
        <button className={styles.overlay} onClick={skipPlayerTransition}>
          <div className={styles.overlayPanel}>
            <h2>{playerNames[1]}, your turn</h2>
            <p>{playerTransitionCountdown}</p>
            <small>Clique pour passer</small>
          </div>
        </button>
      )}

      {phase === 'roundTransition' && (
        <div className={styles.roundOverlay}>
          <div className={styles.overlayPanel}>Round suivant…</div>
        </div>
      )}

      <header className={styles.header}>
        <div>
          <h1>Save One · {config.category === 'idols' ? 'Idols' : 'Songs'}</h1>
          <p>Progression: {roundIndex + 1}/{rounds.length}</p>
        </div>
        <div className={styles.headerRight}>
          <span>{playerNames[playerIndex]}</span>
          {config.timerSeconds > 0 && <span className={styles.timer}>{timerLeft}s</span>}
        </div>
      </header>

      {isSongs && (
        <section className={styles.playerSection}>
          <h2>{songPlaybackReady ? 'Choisis ta chanson' : 'Lecture des previews…'}</h2>
          {songEmbedUrl ? (
            <iframe
              title="Song preview"
              className={styles.iframe}
              src={songEmbedUrl}
              allow="autoplay; encrypted-media"
            />
          ) : (
            <div className={styles.iframePlaceholder}>Le player affichera les extraits ici.</div>
          )}
        </section>
      )}

      <section className={styles.choicesGrid}>
        {currentRound.choices.map((choice, index) => {
          if ('idol' in choice) {
            return (
              <button key={choice.id} className={styles.choiceCard} disabled={!canPick} onClick={() => submitChoice(choice, false)}>
                <div className={styles.portraitWrap}>
                  {choice.idol.portrait
                    ? <img src={choice.idol.portrait} alt={choice.idol.name} className={styles.portrait} />
                    : <div className={styles.portraitFallback}>No portrait</div>}
                </div>
                <strong>{choice.idol.name}</strong>
                <span>{choice.groupName}</span>
                {choice.isFormerMember && <small className={styles.former}>Former member</small>}
              </button>
            )
          }

          const revealed = songRevealed[index] ?? false
          return (
            <div key={choice.id} className={styles.songCard}>
              <button
                className={styles.songThumbButton}
                disabled={!canPick || !revealed}
                onClick={() => submitChoice(choice, false)}
              >
                {revealed && choice.thumbnailUrl ? (
                  <img src={choice.thumbnailUrl} alt={choice.song.title} className={styles.songThumb} />
                ) : (
                  <div className={styles.hiddenThumb}>?</div>
                )}
              </button>
              <div className={styles.songMeta}>
                <span className={styles.songTitle}>{revealed ? choice.song.title : 'Hidden title'}</span>
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={!songPlaybackReady || !choice.youtubeId}
                  onClick={() => handleReplay(choice)}
                >
                  Replay
                </button>
              </div>
            </div>
          )
        })}
      </section>

      <footer className={styles.footer}>
        <button className="btn btn--ghost" disabled={!canPick} onClick={() => submitChoice(null, false)}>
          Pass
        </button>
      </footer>
    </div>
  )
}
