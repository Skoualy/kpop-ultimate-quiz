import type { ReactNode } from 'react'
import { GameSummary, type SummaryRound } from '@/shared/Components/GameSummary'
import { QUICK_VOTE_LABELS } from '@/shared/constants'
import type { QuickVoteSummaryProps } from './QuickVoteSummary.types'
import type { IdolItem, SongItem, QuickVoteResult } from '../../QuickVotePage.types'
import type { RoundData } from '../../QuickVotePage.types'
import styles from './QuickVoteSummary.module.scss'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItemLabel(item: IdolItem | SongItem) {
  return item.type === 'idol' ? item.name : item.title
}
function getItemImage(item: IdolItem | SongItem): string | null {
  return item.type === 'idol' ? (item.portrait ?? null) : item.thumbnailUrl
}

function computeTopGroups(
  rounds: RoundData[],
  results: QuickVoteResult[],
  playerIndex: 0 | 1,
): Array<{ groupName: string; count: number }> {
  const positives = results.filter((r) => r.playerIndex === playerIndex && r.vote === 'positive')
  const tally = new Map<string, number>()
  for (const r of positives) {
    const item = rounds[r.roundIndex]?.items[0] as IdolItem | SongItem | undefined
    if (item?.groupName) tally.set(item.groupName, (tally.get(item.groupName) ?? 0) + 1)
  }
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([groupName, count]) => ({ groupName, count }))
  if (entries.length === 0 || entries[0].count < 2) return []
  return entries.slice(0, 3)
}

function computeStats(results: QuickVoteResult[], playerIndex: 0 | 1) {
  const filtered = results.filter((r) => r.playerIndex === playerIndex)
  const positive = filtered.filter((r) => r.vote === 'positive').length
  const negative = filtered.filter((r) => r.vote === 'negative').length
  const total = filtered.length
  const rate = total > 0 ? Math.round((positive / total) * 100) : 0
  return { positive, negative, total, rate }
}

// ─── Item row de round ────────────────────────────────────────────────────────

function QVRoundItem({
  item,
  result,
  positiveLabel,
  negativeLabel,
}: {
  item: IdolItem | SongItem
  result?: QuickVoteResult
  positiveLabel: string
  negativeLabel: string
}) {
  const img = getItemImage(item)
  const isPositive = result?.vote === 'positive'
  const isPass = result?.vote === null && !result.isTimeout

  return (
    <div className={[styles.roundItemRow, isPositive ? styles.voteItem : styles.skipItem].join(' ')}>
      {/* Image portrait ou miniature — même logique que SaveOne */}
      <div className={[styles.itemImg, item.type === 'idol' ? styles.portraitImg : styles.thumbImg].join(' ')}>
        {img ? <img src={img} alt={getItemLabel(item)} /> : <div className={styles.imgPlaceholder} />}
      </div>

      {/* Infos */}
      <div className={styles.itemInfo}>
        <p className={styles.itemLabel}>{getItemLabel(item)}</p>
        <p className={styles.itemGroup}>{item.groupName}</p>
      </div>

      {/* Badge vote */}
      {result && !isPass && (
        <span
          className={[styles.voteBadge, isPositive ? styles.voteBadgePositive : styles.voteBadgeNegative].join(' ')}
        >
          <span className={styles.voteBadgeIcon} aria-hidden>
            {isPositive ? '♥' : '✕'}
          </span>
          {isPositive ? positiveLabel : negativeLabel}
          {result.isTimeout && <span className={styles.timeoutMark}> ⏱</span>}
        </span>
      )}
    </div>
  )
}

// ─── Colonne stats joueur ─────────────────────────────────────────────────────

function PlayerStatContent({
  stats,
  topGroups,
  positiveLabel,
  negativeLabel,
  rateLabel,
}: {
  stats: ReturnType<typeof computeStats>
  topGroups: Array<{ groupName: string; count: number }>
  positiveLabel: string
  negativeLabel: string
  rateLabel: string
}): ReactNode {
  const hasStats = stats.total > 0 || topGroups.length > 0
  if (!hasStats) return <p className={styles.noStats}>Pas encore de stats</p>

  return (
    <>
      {/* Smash / Top rate */}
      {stats.total > 0 && (
        <div className={styles.statRow}>
          <div className={styles.counter}></div>
          <span className={`${styles.statValue} ${styles.counterPositive}`}>{stats.positive}</span>
          <span className={styles.statSub}>{positiveLabel}</span>
          <span className={`${styles.statValue} ${styles.counterNegative}`}>{stats.negative}</span>
          <span className={styles.statSub}>{negativeLabel}</span>
          <span className={styles.statIcon}>📊</span>
          <span className={styles.statValue}>{stats.rate}%</span>
          <span className={styles.statSub}>{rateLabel}</span>
        </div>
      )}

      {/* Podium artistes */}
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

export function QuickVoteSummary({ rounds, results, config, onRestart, onBackToConfig }: QuickVoteSummaryProps) {
  const twoPlayer = config.twoPlayerMode
  const p1Name = config.player1Name || 'Joueur 1'
  const p2Name = config.player2Name || 'Joueur 2'
  const voteLabels = QUICK_VOTE_LABELS
  const rateLabel = 'Smash rate' // config.category === 'idols' ? 'Smash rate' : 'Top rate'

  // ── Stats ──────────────────────────────────────────────────────────────────

  const p1Stats = computeStats(results, 0)
  const p2Stats = twoPlayer ? computeStats(results, 1) : null
  const p1TopGroups = computeTopGroups(rounds, results, 0)
  const p2TopGroups = twoPlayer ? computeTopGroups(rounds, results, 1) : []

  // ── Rounds pour GameSummary ────────────────────────────────────────────────

  const summaryRounds: SummaryRound[] = rounds.map((round) => {
    const item = round.items[0] as IdolItem | SongItem | undefined
    const p1Res = results.find((r) => r.roundIndex === round.roundNumber - 1 && r.playerIndex === 0)
    const p2Res = twoPlayer
      ? results.find((r) => r.roundIndex === round.roundNumber - 1 && r.playerIndex === 1)
      : undefined

    // Même vote → "★ Même vote !" (analogue au "★ Même choix !" du Save One)
    const sameVote = twoPlayer && p1Res && p2Res && p1Res.vote === p2Res.vote

    const renderItem = (result?: QuickVoteResult) =>
      item ? (
        <QVRoundItem
          item={item}
          result={result}
          positiveLabel={voteLabels.positive}
          negativeLabel={voteLabels.negative}
        />
      ) : null

    return {
      roundNumber: round.roundNumber,
      matchLabel: sameVote ? '★ Même vote !' : undefined,
      p1Content: renderItem(p1Res),
      p2Content: twoPlayer ? renderItem(p2Res) : undefined,
    }
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <GameSummary
      title="Résumé de partie"
      subtitle={`${rounds.length} rounds · Smash or Pass — ${voteLabels.title} · ${config.category === 'idols' ? 'Idoles' : 'Chansons'}`}
      onRestart={onRestart}
      onBackToConfig={onBackToConfig}
      twoPlayer={twoPlayer}
      p1Name={p1Name}
      p2Name={p2Name}
      p1Stats={
        <PlayerStatContent
          stats={p1Stats}
          topGroups={p1TopGroups}
          positiveLabel={voteLabels.positive}
          negativeLabel={voteLabels.negative}
          rateLabel={rateLabel}
        />
      }
      p2Stats={
        twoPlayer && p2Stats ? (
          <PlayerStatContent
            stats={p2Stats}
            topGroups={p2TopGroups}
            positiveLabel={voteLabels.positive}
            negativeLabel={voteLabels.negative}
            rateLabel={rateLabel}
          />
        ) : undefined
      }
      summaryRounds={summaryRounds}
    />
  )
}
