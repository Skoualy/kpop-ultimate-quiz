import { useRef } from 'react'
import { ScrollTopControl } from '@/shared/Controls/ScrollTopControl'
import type { IdolItem, RoundResult, SongItem } from '../../SaveOnePage.types'
import type { SaveOneSummaryProps } from './SaveOneSummary.types'
import styles from './SaveOneSummary.module.scss'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getItemId(item: IdolItem | SongItem) { return item.type === 'idol' ? item.idolId : item.songId }
function getItemLabel(item: IdolItem | SongItem) { return item.type === 'idol' ? item.name : item.title }
function getItemGroup(item: IdolItem | SongItem) { return item.groupName }
function getItemImage(item: IdolItem | SongItem): string | null {
  return item.type === 'idol' ? (item.portrait ?? null) : item.thumbnailUrl
}

function computeTopGroupsForPlayer(
  rounds: SaveOneSummaryProps['rounds'],
  results: RoundResult[],
  playerIndex: 0 | 1,
): Array<{ groupName: string; count: number }> {
  const filtered = results.filter((r) => r.playerIndex === playerIndex && r.chosenId)
  const tally = new Map<string, number>()
  for (const r of filtered) {
    const round = rounds[r.roundIndex]
    const item  = (round.items as (IdolItem | SongItem)[]).find((i) => getItemId(i) === r.chosenId)
    if (!item) continue
    tally.set(item.groupName, (tally.get(item.groupName) ?? 0) + 1)
  }
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([groupName, count]) => ({ groupName, count }))
  if (entries.length === 0 || entries[0].count < 2) return []
  return entries.slice(0, 3)
}

function fastestChoiceForPlayer(
  rounds: SaveOneSummaryProps['rounds'],
  results: RoundResult[],
  playerIndex: 0 | 1,
): { label: string; ms: number } | null {
  const timed = results.filter((r) => r.playerIndex === playerIndex && r.timeMs !== null && r.chosenId)
  if (timed.length === 0) return null
  const fastest = timed.reduce((a, b) => (b.timeMs! < a.timeMs! ? b : a))
  const round   = rounds[fastest.roundIndex]
  const item    = (round.items as (IdolItem | SongItem)[]).find((i) => getItemId(i) === fastest.chosenId)
  return item ? { label: getItemLabel(item), ms: fastest.timeMs! } : null
}

// ─── Item card ────────────────────────────────────────────────────────────────

function SummaryItemCard({ item, isChosen, isPass, isTimeout }: {
  item: IdolItem | SongItem
  isChosen: boolean
  isPass?: boolean
  isTimeout?: boolean
}) {
  const img = getItemImage(item)
  return (
    <div className={[styles.summaryItem, isChosen ? styles.chosenItem : styles.droppedItem].join(' ')}>
      <div className={[styles.summaryImg, item.type === 'idol' ? styles.portraitImg : styles.thumbImg].join(' ')}>
        {img ? (
          <img src={img} alt={getItemLabel(item)}
            onError={(e) => { ;(e.currentTarget as HTMLImageElement).style.display = 'none' }}
            draggable={false} />
        ) : <div className={styles.imgPlaceholder} />}
        {isChosen && !isPass && !isTimeout && <span className={styles.chosenBadge}>✓</span>}
      </div>
      <p className={styles.summaryLabel}>{getItemLabel(item)}</p>
      <p className={styles.summaryGroup}>{getItemGroup(item)}</p>
      {isPass    && <span className={[styles.statusPill, styles.passPill].join(' ')}>⏭ Pass</span>}
      {isTimeout && <span className={[styles.statusPill, styles.timeoutPill].join(' ')}>⏱ Timeout</span>}
    </div>
  )
}

// ─── Mini stats block (inliné dans les colonnes 2J) ──────────────────────────

function PlayerStats({ fastest, topGroups }: {
  fastest: { label: string; ms: number } | null
  topGroups: Array<{ groupName: string; count: number }>
}) {
  if (!fastest && topGroups.length === 0) return null
  return (
    <div className={styles.playerStats}>
      {fastest && (
        <div className={styles.playerStat}>
          <span className={styles.playerStatIcon}>⚡</span>
          <span className={styles.playerStatValue}>{(fastest.ms / 1000).toFixed(1)}s</span>
          <span className={styles.playerStatLabel}>{fastest.label}</span>
        </div>
      )}
      {topGroups.length > 0 && (
        <div className={styles.playerStat}>
          <span className={styles.playerStatIcon}>🏆</span>
          <div className={styles.miniPodium}>
            {topGroups.map((g, i) => (
              <span key={g.groupName} className={[styles.miniPodiumItem, styles[`rank${i + 1}`]].join(' ')}>
                {i + 1}. {g.groupName} ({g.count}×)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Round card 1J ────────────────────────────────────────────────────────────

function RoundCard1P({ round, result }: {
  round: SaveOneSummaryProps['rounds'][0]
  result?: RoundResult
}) {
  const items = round.items as (IdolItem | SongItem)[]
  return (
    <div className={styles.roundCard}>
      <p className={styles.roundLabel}>Round {round.roundNumber}</p>
      <div className={styles.roundItems}>
        {items.map((item) => {
          const id = getItemId(item)
          return (
            <SummaryItemCard key={id} item={item}
              isChosen={result?.chosenId === id}
              isPass={result?.chosenId === id && result.isPass}
              isTimeout={result?.chosenId === id && result.isTimeout}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Round card 2J ────────────────────────────────────────────────────────────

function RoundCard2P({ round, p1Result, p2Result, p1Name, p2Name }: {
  round: SaveOneSummaryProps['rounds'][0]
  p1Result?: RoundResult
  p2Result?: RoundResult
  p1Name: string
  p2Name: string
}) {
  const items      = round.items as (IdolItem | SongItem)[]
  const p1Id       = p1Result?.chosenId ?? null
  const p2Id       = p2Result?.chosenId ?? null
  const sameChoice = p1Id && p2Id && p1Id === p2Id

  return (
    <div className={styles.roundCard}>
      <div className={styles.roundCardHeader}>
        <p className={styles.roundLabel}>Round {round.roundNumber}</p>
        {sameChoice && <span className={styles.matchBanner}>★ Même choix !</span>}
      </div>
      <div className={styles.twoColLayout}>
        <div className={styles.playerCol}>
          <p className={styles.playerColLabel}>{p1Name}</p>
          <div className={styles.roundItems}>
            {items.map((item) => {
              const id = getItemId(item)
              return <SummaryItemCard key={id} item={item}
                isChosen={p1Id === id}
                isPass={p1Id === id && p1Result?.isPass}
                isTimeout={p1Id === id && p1Result?.isTimeout} />
            })}
          </div>
        </div>
        <div className={styles.colDivider} aria-hidden />
        <div className={styles.playerCol}>
          <p className={[styles.playerColLabel, styles.p2Label].join(' ')}>{p2Name}</p>
          <div className={styles.roundItems}>
            {items.map((item) => {
              const id = getItemId(item)
              return <SummaryItemCard key={id} item={item}
                isChosen={p2Id === id}
                isPass={p2Id === id && p2Result?.isPass}
                isTimeout={p2Id === id && p2Result?.isTimeout} />
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SaveOneSummary({ rounds, results, config, onRestart, onBackToConfig }: SaveOneSummaryProps) {
  const twoPlayer = config.twoPlayerMode
  const p1Name    = config.player1Name || 'Joueur 1'
  const p2Name    = config.player2Name || 'Joueur 2'
  const pageRef   = useRef<HTMLDivElement>(null)

  // Stats J1 (toujours)
  const p1Fastest   = fastestChoiceForPlayer(rounds, results, 0)
  const p1TopGroups = computeTopGroupsForPlayer(rounds, results, 0)
  // Stats J2 (si 2J)
  const p2Fastest   = twoPlayer ? fastestChoiceForPlayer(rounds, results, 1) : null
  const p2TopGroups = twoPlayer ? computeTopGroupsForPlayer(rounds, results, 1) : []

  return (
    <div className={styles.page} ref={pageRef}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Résumé de partie</h1>
          <p className={styles.subtitle}>
            {rounds.length} rounds · Save One · {config.category === 'idols' ? 'Idoles' : 'Chansons'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={onBackToConfig}>← Config</button>
          <button className={styles.btnPrimary} onClick={onRestart}>▶ Rejouer</button>
        </div>
      </div>

      {/* ── Rounds ── */}
      <div className={styles.rounds}>
        {rounds.map((round) => {
          const p1 = results.find((r) => r.roundIndex === round.roundNumber - 1 && r.playerIndex === 0)
          const p2 = results.find((r) => r.roundIndex === round.roundNumber - 1 && r.playerIndex === 1)
          return twoPlayer ? (
            <RoundCard2P key={round.roundNumber} round={round}
              p1Result={p1} p2Result={p2} p1Name={p1Name} p2Name={p2Name} />
          ) : (
            <RoundCard1P key={round.roundNumber} round={round} result={p1} />
          )
        })}
      </div>

      {/* ── Stats ── */}
      {twoPlayer ? (
        // 2J : stats dans deux colonnes
        <div className={styles.statsRow2P}>
          <div className={styles.statCard2P}>
            <p className={styles.statCardTitle}>{p1Name}</p>
            <PlayerStats fastest={p1Fastest} topGroups={p1TopGroups} />
          </div>
          <div className={[styles.statCard2P, styles.statCard2PP2].join(' ')}>
            <p className={styles.statCardTitle}>{p2Name}</p>
            <PlayerStats fastest={p2Fastest} topGroups={p2TopGroups} />
          </div>
        </div>
      ) : (
        // 1J : stats normales
        (p1Fastest || p1TopGroups.length > 0) && (
          <div className={styles.stats}>
            {p1Fastest && (
              <div className={styles.statCard}>
                <p className={styles.statIcon}>⚡</p>
                <p className={styles.statValue}>{(p1Fastest.ms / 1000).toFixed(1)}s</p>
                <p className={styles.statLabel}>Choix le plus rapide</p>
                <p className={styles.statSub}>{p1Fastest.label}</p>
              </div>
            )}
            {p1TopGroups.length > 0 && (
              <div className={styles.statCard}>
                <p className={styles.statIcon}>🏆</p>
                <p className={styles.statLabel}>Groupes favoris</p>
                <div className={styles.podium}>
                  {p1TopGroups.map((g, i) => (
                    <div key={g.groupName} className={[styles.podiumItem, styles[`rank${i + 1}`]].join(' ')}>
                      <span className={styles.podiumRank}>{i + 1}</span>
                      <span className={styles.podiumName}>{g.groupName}</span>
                      <span className={styles.podiumCount}>{g.count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      <ScrollTopControl scrollTarget={pageRef.current} threshold={150} />
    </div>
  )
}
