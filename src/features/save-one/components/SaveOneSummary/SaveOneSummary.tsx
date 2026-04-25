import type { ReactNode } from 'react'
import { GameSummary, type SummaryRound } from '@/shared/Components/GameSummary'
import type { IdolItem, RoundResult, SongItem } from '../../SaveOnePage.types'
import type { SaveOneSummaryProps } from './SaveOneSummary.types'
import styles from './SaveOneSummary.module.scss'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItemId(item: IdolItem | SongItem) { return item.type === 'idol' ? item.idolId : item.songId }
function getItemLabel(item: IdolItem | SongItem) { return item.type === 'idol' ? item.name : item.title }
function getItemImage(item: IdolItem | SongItem): string | null {
  return item.type === 'idol' ? (item.portrait ?? null) : item.thumbnailUrl
}

function computeTopGroups(
  rounds:      SaveOneSummaryProps['rounds'],
  results:     RoundResult[],
  playerIndex: 0 | 1,
): Array<{ groupName: string; count: number }> {
  const filtered = results.filter((r) => r.playerIndex === playerIndex && r.chosenId)
  const tally    = new Map<string, number>()
  for (const r of filtered) {
    const round = rounds[r.roundIndex]
    const item  = (round.items as (IdolItem | SongItem)[]).find((i) => getItemId(i) === r.chosenId)
    if (!item) continue
    tally.set(item.groupName, (tally.get(item.groupName) ?? 0) + 1)
  }
  const entries = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([groupName, count]) => ({ groupName, count }))
  if (entries.length === 0 || entries[0].count < 2) return []
  return entries.slice(0, 3)
}

function fastestChoice(
  rounds:      SaveOneSummaryProps['rounds'],
  results:     RoundResult[],
  playerIndex: 0 | 1,
): { label: string; ms: number } | null {
  const timed = results.filter((r) => r.playerIndex === playerIndex && r.timeMs !== null && r.chosenId)
  if (timed.length === 0) return null
  const fastest = timed.reduce((a, b) => (b.timeMs! < a.timeMs! ? b : a))
  const round   = rounds[fastest.roundIndex]
  const item    = (round.items as (IdolItem | SongItem)[]).find((i) => getItemId(i) === fastest.chosenId)
  return item ? { label: getItemLabel(item), ms: fastest.timeMs! } : null
}

// ─── Item card du résumé ──────────────────────────────────────────────────────

function SummaryItemCard({ item, isChosen, isPass, isTimeout }: {
  item:      IdolItem | SongItem
  isChosen:  boolean
  isPass?:   boolean
  isTimeout?: boolean
}) {
  const img = getItemImage(item)
  return (
    <div className={[styles.summaryItem, isChosen ? styles.chosenItem : styles.droppedItem].join(' ')}>
      <div className={[styles.summaryImg, item.type === 'idol' ? styles.portraitImg : styles.thumbImg].join(' ')}>
        {img
          ? <img src={img} alt={getItemLabel(item)} />
          : <div className={styles.imgPlaceholder} />
        }
        {isChosen && !isPass && (
          <span className={styles.chosenBadge}>✓</span>
        )}
      </div>
      <span className={styles.summaryLabel}>{getItemLabel(item)}</span>
      <span className={styles.summaryGroup}>{item.groupName}</span>
      {isChosen && isPass && <span className={styles.passBadge}>{isTimeout ? 'Timeout' : 'Pass'}</span>}
    </div>
  )
}

// ─── Player stat column ───────────────────────────────────────────────────────

function PlayerStatContent({ fastest, topGroups }: {
  fastest:   { label: string; ms: number } | null
  topGroups: Array<{ groupName: string; count: number }>
}): ReactNode {
  const hasStats = fastest || topGroups.length > 0
  if (!hasStats) return <p className={styles.noStats}>Pas encore de stats</p>

  return (
    <>
      {fastest && (
        <div className={styles.statRow}>
          <span className={styles.statIcon}>⚡</span>
          <span className={styles.statValue}>{(fastest.ms / 1000).toFixed(1)}s</span>
          <span className={styles.statSub}>{fastest.label}</span>
        </div>
      )}
      {topGroups.length > 0 && (
        <div className={styles.statRow}>
          <span className={styles.statIcon}>🏆</span>
          <div className={styles.podium}>
            {topGroups.map((g, i) => (
              <div key={g.groupName} className={[styles.podiumItem, styles[`rank${i + 1}`]].join(' ')}>
                <span className={styles.podiumRank}>{i + 1}</span>
                <span className={styles.podiumName}>{g.groupName}</span>
                <span className={styles.podiumCount}>{g.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SaveOneSummary({ rounds, results, config, onRestart, onBackToConfig }: SaveOneSummaryProps) {
  const twoPlayer = config.twoPlayerMode
  const p1Name    = config.player1Name || 'Joueur 1'
  const p2Name    = config.player2Name || 'Joueur 2'

  // ── Stats ──────────────────────────────────────────────────────────────────

  const p1Fastest   = fastestChoice(rounds, results, 0)
  const p1TopGroups = computeTopGroups(rounds, results, 0)
  const p2Fastest   = twoPlayer ? fastestChoice(rounds, results, 1) : null
  const p2TopGroups = twoPlayer ? computeTopGroups(rounds, results, 1) : []

  // ── Choix communs ──────────────────────────────────────────────────────────

  const commonChoicesCount = twoPlayer
    ? results.reduce((acc, r1) => {
        if (r1.playerIndex !== 0 || !r1.chosenId) return acc
        const r2 = results.find((r) => r.playerIndex === 1 && r.roundIndex === r1.roundIndex)
        return r2?.chosenId === r1.chosenId ? acc + 1 : acc
      }, 0)
    : 0

  // ── Rounds pour GameSummary ────────────────────────────────────────────────

  const summaryRounds: SummaryRound[] = rounds.map((round) => {
    const items  = round.items as (IdolItem | SongItem)[]
    const p1Res  = results.find((r) => r.roundIndex === round.roundNumber - 1 && r.playerIndex === 0)
    const p2Res  = results.find((r) => r.roundIndex === round.roundNumber - 1 && r.playerIndex === 1)
    const p1Id   = p1Res?.chosenId ?? null
    const p2Id   = p2Res?.chosenId ?? null
    const sameChoice = twoPlayer && p1Id && p2Id && p1Id === p2Id

    const renderItems = (chosenId: string | null, result?: RoundResult) => (
      <div className={styles.roundItems}>
        {items.map((item) => {
          const id = getItemId(item)
          return (
            <SummaryItemCard
              key={id}
              item={item}
              isChosen={chosenId === id}
              isPass={chosenId === id && result?.isPass}
              isTimeout={chosenId === id && result?.isTimeout}
            />
          )
        })}
      </div>
    )

    return {
      roundNumber: round.roundNumber,
      matchLabel:  sameChoice ? '★ Même choix !' : undefined,
      p1Content:   renderItems(p1Id, p1Res),
      p2Content:   twoPlayer ? renderItems(p2Id, p2Res) : undefined,
    }
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <GameSummary
      title="Résumé de partie"
      subtitle={`${rounds.length} rounds · Save One · ${config.category === 'idols' ? 'Idoles' : 'Chansons'}`}
      onRestart={onRestart}
      onBackToConfig={onBackToConfig}
      twoPlayer={twoPlayer}
      p1Name={p1Name}
      p2Name={p2Name}
      commonChoicesCount={commonChoicesCount}
      p1Stats={<PlayerStatContent fastest={p1Fastest} topGroups={p1TopGroups} />}
      p2Stats={twoPlayer ? <PlayerStatContent fastest={p2Fastest} topGroups={p2TopGroups} /> : undefined}
      summaryRounds={summaryRounds}
    />
  )
}
