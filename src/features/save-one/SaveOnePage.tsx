import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { useIdolList } from '@/shared/hooks/useIdolList'
import { extractYoutubeId } from '@/shared/utils/youtube'
import {
  buildIdolPool,
  buildSaveOneRounds,
  buildSongPool,
  type SaveOneIdolItem,
  type SaveOneItem,
  type SaveOneRound,
  type SaveOneSongItem,
} from './saveOne.logic'
import styles from './SaveOnePage.module.scss'

type PickResult = {
  pickedItemId: string | null
  byTimeout: boolean
  responseMs: number | null
}

interface RoundRecord {
  roundIndex: number
  players: [PickResult | null, PickResult | null]
}

function shuffleLabel(configLabel: string) {
  return configLabel.trim() || 'Joueur'
}

function useRoundTimer(enabledSeconds: number, isEnabled: boolean, onTimeout: () => void) {
  const [remaining, setRemaining] = useState(enabledSeconds)

  useEffect(() => {
    setRemaining(enabledSeconds)
  }, [enabledSeconds])

  useEffect(() => {
    if (!isEnabled || enabledSeconds <= 0) return
    if (remaining <= 0) {
      onTimeout()
      return
    }

    const id = window.setTimeout(() => {
      setRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => window.clearTimeout(id)
  }, [remaining, enabledSeconds, isEnabled, onTimeout])

  return remaining
}

function PlayerOverlay({ playerName, onDone }: { playerName: string; onDone: () => void }) {
  const [count, setCount] = useState(2)

  useEffect(() => {
    if (count <= 0) {
      onDone()
      return
    }
    const id = window.setTimeout(() => setCount((prev) => prev - 1), 650)
    return () => window.clearTimeout(id)
  }, [count, onDone])

  return (
    <button className={styles.overlay} onClick={onDone}>
      <div className={styles.overlayBox}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Transition joueur</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{playerName}, à toi !</div>
        <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>⏱ {count}</div>
      </div>
    </button>
  )
}

function RoundOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 380)
    return () => window.clearTimeout(id)
  }, [onDone])

  return (
    <div className={styles.overlay}>
      <div className={styles.overlayBox} style={{ padding: '12px 16px' }}>
        Round suivant…
      </div>
    </div>
  )
}

function IdolRound({
  round,
  onPick,
  timerSeconds,
  timerEnabled,
  lock,
}: {
  round: SaveOneRound<SaveOneIdolItem>
  onPick: (result: PickResult) => void
  timerSeconds: number
  timerEnabled: boolean
  lock: boolean
}) {
  const startAt = useRef(performance.now())
  const timeoutSent = useRef(false)

  const remaining = useRoundTimer(timerSeconds, timerEnabled && !lock, () => {
    if (timeoutSent.current || lock) return
    timeoutSent.current = true
    onPick({ pickedItemId: null, byTimeout: true, responseMs: null })
  })

  useEffect(() => {
    startAt.current = performance.now()
    timeoutSent.current = false
  }, [round.roundIndex])

  function choose(item: SaveOneIdolItem) {
    if (lock) return
    onPick({ pickedItemId: item.id, byTimeout: false, responseMs: Math.round(performance.now() - startAt.current) })
  }

  const timerPct = timerSeconds > 0 ? (remaining / timerSeconds) * 100 : 0

  return (
    <div className={styles.body}>
      {timerEnabled && timerSeconds > 0 && (
        <div className={styles.timerTrack}>
          <div className={styles.timerBar} style={{ width: `${timerPct}%` }} />
        </div>
      )}

      <div className={styles.cardsGrid}>
        {round.items.map((item) => (
          <div className={styles.idolCard} key={item.id}>
            <button className={styles.idolButton} onClick={() => choose(item)} disabled={lock}>
              <div className={styles.idolImageWrap}>
                <img
                  className={styles.idolImage}
                  src={item.portrait ?? '/assets/placeholders/idol-female.webp'}
                  alt={item.idolName}
                />
              </div>
              <div className={styles.idolMeta}>
                <div style={{ fontWeight: 700, fontSize: 22 }}>{item.idolName}</div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {item.groupName}
                  {item.isFormer ? ' · Ancien membre' : ''}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div>
        <button
          className="btn btn--ghost"
          onClick={() => onPick({ pickedItemId: null, byTimeout: false, responseMs: null })}
          disabled={lock}
        >
          ⏭ Passer
        </button>
      </div>
    </div>
  )
}

function SongRound({
  round,
  onPick,
  clipDuration,
  timerSeconds,
  timerEnabled,
  lock,
  isSecondPlayer,
}: {
  round: SaveOneRound<SaveOneSongItem>
  onPick: (result: PickResult) => void
  clipDuration: number
  timerSeconds: number
  timerEnabled: boolean
  lock: boolean
  isSecondPlayer: boolean
}) {
  const startAt = useRef(performance.now())
  const [seqIndex, setSeqIndex] = useState(0)
  const [revealed, setRevealed] = useState<boolean[]>(round.items.map((_, idx) => idx === 0 || isSecondPlayer))
  const [sequenceDone, setSequenceDone] = useState(isSecondPlayer)
  const [currentPlay, setCurrentPlay] = useState<{ idx: number; nonce: number; autoplay: boolean }>({
    idx: 0,
    nonce: Date.now(),
    autoplay: !isSecondPlayer,
  })

  useEffect(() => {
    setSeqIndex(0)
    setRevealed(round.items.map((_, idx) => idx === 0 || isSecondPlayer))
    setSequenceDone(isSecondPlayer)
    setCurrentPlay({ idx: 0, nonce: Date.now(), autoplay: !isSecondPlayer })
    startAt.current = performance.now()
  }, [round.roundIndex, isSecondPlayer, round.items])

  useEffect(() => {
    if (isSecondPlayer || sequenceDone) return
    const id = window.setTimeout(() => {
      setRevealed((prev) => prev.map((flag, idx) => (idx === seqIndex ? true : flag)))
      const next = seqIndex + 1
      if (next >= round.items.length) {
        setSequenceDone(true)
        return
      }
      setSeqIndex(next)
      setCurrentPlay({ idx: next, nonce: Date.now(), autoplay: true })
    }, 1000 * timerSecondsForClip)
    return () => window.clearTimeout(id)
  }, [seqIndex, sequenceDone, round.items.length, isSecondPlayer, clipDuration])

  const canChoose = sequenceDone && !lock
  const timerActive = timerEnabled && timerSeconds > 0 && canChoose
  const remaining = useRoundTimer(timerSeconds, timerActive, () => {
    if (!canChoose) return
    onPick({ pickedItemId: null, byTimeout: true, responseMs: null })
  })

  const timerPct = timerSeconds > 0 ? (remaining / timerSeconds) * 100 : 0
  const currentItem = round.items[currentPlay.idx] ?? round.items[0]
  const timerSecondsForClip = Math.max(1, clipDuration)

  function buildEmbed(item: SaveOneSongItem, autoplay: boolean) {
    const id = extractYoutubeId(item.youtubeUrl)
    if (!id) return ''
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      start: String(item.startSeconds),
      controls: '0',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
    })
    return `https://www.youtube.com/embed/${id}?${params.toString()}`
  }

  function pick(item: SaveOneSongItem) {
    if (!canChoose) return
    onPick({ pickedItemId: item.id, byTimeout: false, responseMs: Math.round(performance.now() - startAt.current) })
  }

  return (
    <div className={styles.body}>
      {timerActive && (
        <div className={styles.timerTrack}>
          <div className={styles.timerBar} style={{ width: `${timerPct}%` }} />
        </div>
      )}

      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 24 }}>
        ♪ {currentItem?.title ?? 'Extrait'} — {currentItem?.groupName ?? ''}
      </div>

      <div className={styles.songPlayer}>
        {currentItem && !currentItem.unavailable ? (
          <iframe
            key={`${currentItem.id}-${currentPlay.nonce}`}
            src={buildEmbed(currentItem, currentPlay.autoplay)}
            width="100%"
            height="100%"
            allow="autoplay; encrypted-media"
            title={currentItem.title}
          />
        ) : (
          <div className={styles.thumbMask}>Vidéo indisponible</div>
        )}
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        {sequenceDone ? 'Choisis la chanson à garder' : `Lecture ${seqIndex + 1} / ${round.items.length}`}
      </div>

      <div className={styles.thumbsGrid}>
        {round.items.map((item, idx) => (
          <div className={styles.songCard} key={item.id}>
            <button className={styles.songThumbBtn} onClick={() => pick(item)} disabled={!canChoose}>
              {revealed[idx] ? (
                <img className={styles.thumb} src={item.thumbnailUrl} alt={item.title} />
              ) : (
                <div className={styles.thumbMask}>♫</div>
              )}
              <div className={styles.meta}>
                <div style={{ fontWeight: 700 }}>{revealed[idx] ? item.title : 'Titre masqué'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{revealed[idx] ? item.groupName : 'Groupe masqué'}</div>
              </div>
            </button>
            <button
              className="btn btn--ghost btn--sm"
              style={{ margin: '0 8px 8px' }}
              disabled={!sequenceDone || item.unavailable}
              onClick={() => setCurrentPlay({ idx, nonce: Date.now(), autoplay: true })}
            >
              ↻ Rejouer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function resolveChoice(round: SaveOneRound<SaveOneItem>, pickId: string | null): SaveOneItem | null {
  if (!pickId) return null
  return round.items.find((item) => item.id === pickId) ?? null
}

export default function SaveOnePage() {
  const navigate = useNavigate()
  const { config } = useGameContext()
  const { data: groups, loading: loadingGroups } = useGroupList()
  const { data: idols, loading: loadingIdols } = useIdolList()
  const groupList = groups ?? []
  const idolList = idols ?? []

  const playableGroups = useMemo(() => {
    if (config.selectedGroupIds.length === 0) return groupList
    const set = new Set(config.selectedGroupIds)
    return groupList.filter((group) => set.has(group.id))
  }, [groupList, config.selectedGroupIds])

  const choiceCount = config.drops + 1

  const rounds = useMemo(() => {
    if (config.category === 'idols') {
      const pool = buildIdolPool(playableGroups, idolList, config)
      return buildSaveOneRounds(pool, config.rounds, choiceCount)
    }
    const pool = buildSongPool(playableGroups, config.clipDuration, config.songType)
    return buildSaveOneRounds(pool, config.rounds, choiceCount)
  }, [config, playableGroups, idolList, choiceCount])

  const [roundIndex, setRoundIndex] = useState(0)
  const [playerTurn, setPlayerTurn] = useState<0 | 1>(0)
  const [records, setRecords] = useState<RoundRecord[]>([])
  const [showPlayerOverlay, setShowPlayerOverlay] = useState(false)
  const [showRoundOverlay, setShowRoundOverlay] = useState(false)

  useEffect(() => {
    setRoundIndex(0)
    setPlayerTurn(0)
    setRecords([])
  }, [config.category, config.rounds, config.drops, config.selectedGroupIds, config.songType, config.twoPlayerMode])

  const done = roundIndex >= rounds.length
  const currentRound = rounds[roundIndex]
  const playerNames: [string, string] = [shuffleLabel(config.player1Name), shuffleLabel(config.player2Name)]

  function registerPick(result: PickResult) {
    if (!currentRound) return

    setRecords((prev) => {
      const next = [...prev]
      const row = next.find((r) => r.roundIndex === roundIndex)
      if (row) {
        row.players[playerTurn] = result
      } else {
        next.push({ roundIndex, players: [playerTurn === 0 ? result : null, playerTurn === 1 ? result : null] })
      }
      return next
    })

    if (config.twoPlayerMode && playerTurn === 0) {
      setShowPlayerOverlay(true)
      return
    }

    setShowRoundOverlay(true)
  }

  function nextAfterPlayerOverlay() {
    setShowPlayerOverlay(false)
    setPlayerTurn(1)
  }

  function nextAfterRoundOverlay() {
    setShowRoundOverlay(false)
    setRoundIndex((prev) => prev + 1)
    setPlayerTurn(0)
  }

  if (loadingGroups || (config.category === 'idols' && loadingIdols)) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>Chargement…</div>
      </div>
    )
  }

  if (rounds.length < config.rounds) {
    return (
      <div className={styles.page}>
        <div className={styles.shell} style={{ display: 'grid', placeItems: 'center' }}>
          <div>
            <h2>Pool insuffisant</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Impossible de générer {config.rounds} rounds avec {choiceCount} choix.
            </p>
            <button className="btn btn--primary" onClick={() => navigate('/')}>
              Retour config
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (done || !currentRound) {
    const fastest = records
      .flatMap((record) => record.players.map((pick) => ({ round: record.roundIndex + 1, pick })))
      .filter((entry): entry is { round: number; pick: PickResult } => !!entry.pick && entry.pick.responseMs !== null)
      .sort(
        (a, b) => (a.pick.responseMs ?? Number.MAX_SAFE_INTEGER) - (b.pick.responseMs ?? Number.MAX_SAFE_INTEGER),
      )[0]

    const solo = !config.twoPlayerMode

    const topGroups = (() => {
      if (!solo) return []
      const counts = new Map<string, { count: number; totalMs: number; label: string }>()
      records.forEach((record) => {
        const pick = record.players[0]
        if (!pick?.pickedItemId) return
        const round = rounds[record.roundIndex]
        const item = round ? resolveChoice(round as SaveOneRound<SaveOneItem>, pick.pickedItemId) : null
        if (!item) return
        const prev = counts.get(item.groupId) ?? { count: 0, totalMs: 0, label: item.groupName }
        counts.set(item.groupId, {
          count: prev.count + 1,
          totalMs: prev.totalMs + (pick.responseMs ?? 999999),
          label: item.groupName,
        })
      })

      const sorted = [...counts.values()].sort((a, b) => b.count - a.count || a.totalMs - b.totalMs)
      if (!sorted.some((entry) => entry.count > 1)) return []
      return sorted.slice(0, 3)
    })()

    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.topBar}>
            <h2>Résumé Save One</h2>
            <button className="btn btn--secondary" onClick={() => navigate('/')}>
              Retour config
            </button>
          </div>
          {fastest && (
            <div className={styles.badge}>
              Choix le plus rapide : round {fastest.round} ({((fastest.pick.responseMs ?? 0) / 1000).toFixed(2)}s)
            </div>
          )}
          {!solo && (
            <div className={styles.badge}>
              Comparatif {playerNames[0]} vs {playerNames[1]}
            </div>
          )}

          <div className={styles.summary}>
            {records.map((record) => {
              const round = rounds[record.roundIndex] as SaveOneRound<SaveOneItem> | undefined
              const pick1 = record.players[0]
              const pick2 = record.players[1]
              const item1 = round && pick1 ? resolveChoice(round, pick1.pickedItemId) : null
              const item2 = round && pick2 ? resolveChoice(round, pick2.pickedItemId) : null
              const same = item1 && item2 && item1.id === item2.id

              return (
                <div className={styles.summaryRow} key={record.roundIndex}>
                  <div>R{record.roundIndex + 1}</div>
                  <div>
                    {item1 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img
                          className={styles.smallThumb}
                          src={
                            item1.kind === 'idol'
                              ? (item1.portrait ?? '/assets/placeholders/idol-female.webp')
                              : item1.thumbnailUrl
                          }
                          alt={item1.id}
                        />
                        <div>{item1.kind === 'idol' ? item1.idolName : item1.title}</div>
                      </div>
                    ) : (
                      <span>{pick1?.byTimeout ? 'Timeout' : 'Pass'}</span>
                    )}
                  </div>
                  <div>
                    {config.twoPlayerMode ? (
                      item2 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img
                            className={styles.smallThumb}
                            src={
                              item2.kind === 'idol'
                                ? (item2.portrait ?? '/assets/placeholders/idol-female.webp')
                                : item2.thumbnailUrl
                            }
                            alt={item2.id}
                          />
                          <div>{item2.kind === 'idol' ? item2.idolName : item2.title}</div>
                        </div>
                      ) : (
                        <span>{pick2?.byTimeout ? 'Timeout' : 'Pass'}</span>
                      )
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>{item1?.groupName ?? '-'}</span>
                    )}
                    {same && <div className={styles.commonPick}>Choix commun</div>}
                  </div>
                </div>
              )
            })}
          </div>

          {topGroups.length > 0 && (
            <div>
              <h3>Top groupes choisis</h3>
              <ol>
                {topGroups.map((entry) => (
                  <li key={entry.label}>
                    {entry.label} ({entry.count})
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.badges}>
            <span className={styles.badge}>
              Round {roundIndex + 1} / {config.rounds}
            </span>
            <span className={styles.badge}>Mode Save One / Drop {config.drops}</span>
            <span className={styles.badge}>Catégorie {config.category === 'idols' ? 'Idoles' : 'Chansons'}</span>
            <span className={styles.badge}>
              Choix {records.filter((r) => !!r.players[0]?.pickedItemId).length} / {config.rounds}
            </span>
          </div>
          <div className={styles.badge}>Tour : {playerNames[playerTurn]}</div>
        </div>

        <h2>{config.category === 'idols' ? 'Idoles — Save One' : 'Chansons — Save One'}</h2>

        {config.category === 'idols' ? (
          <IdolRound
            round={currentRound as SaveOneRound<SaveOneIdolItem>}
            onPick={registerPick}
            timerEnabled={config.timerSeconds > 0}
            timerSeconds={config.timerSeconds}
            lock={showPlayerOverlay || showRoundOverlay}
          />
        ) : (
          <SongRound
            round={currentRound as SaveOneRound<SaveOneSongItem>}
            onPick={registerPick}
            clipDuration={config.clipDuration}
            timerEnabled={config.timerSeconds > 0}
            timerSeconds={config.timerSeconds}
            lock={showPlayerOverlay || showRoundOverlay}
            isSecondPlayer={config.twoPlayerMode && playerTurn === 1}
          />
        )}
      </div>

      {showPlayerOverlay && <PlayerOverlay playerName={playerNames[1]} onDone={nextAfterPlayerOverlay} />}
      {showRoundOverlay && <RoundOverlay onDone={nextAfterRoundOverlay} />}
    </div>
  )
}
