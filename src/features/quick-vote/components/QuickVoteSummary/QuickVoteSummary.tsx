import { QUICK_VOTE_LABELS } from '@/shared/constants'
import type { QuickVoteSummaryProps } from './QuickVoteSummary.types'
import type { IdolItem, SongItem, QuickVoteResult } from '../../QuickVotePage.types'
import styles from './QuickVoteSummary.module.scss'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItemId(item: IdolItem | SongItem): string {
  return item.type === 'idol' ? item.idolId : item.songId
}

function getItemLabel(item: IdolItem | SongItem): string {
  return item.type === 'idol' ? item.name : item.title
}

function getItemImage(item: IdolItem | SongItem): string | null {
  return item.type === 'idol' ? (item.portrait ?? null) : item.thumbnailUrl
}

/** Stats globales d'un joueur. */
function computePlayerStats(results: QuickVoteResult[], playerIndex: 0 | 1) {
  const filtered = results.filter((r) => r.playerIndex === playerIndex)
  const positive = filtered.filter((r) => r.vote === 'positive').length
  const negative = filtered.filter((r) => r.vote === 'negative').length
  const total    = filtered.length
  const rate     = total > 0 ? Math.round((positive / total) * 100) : 0
  return { positive, negative, total, rate }
}

/** Top 3 groupes les plus votés positivement par un joueur. */
function computeTopGroups(
  rounds:      QuickVoteSummaryProps['rounds'],
  results:     QuickVoteResult[],
  playerIndex: 0 | 1,
): Array<{ groupName: string; count: number }> {
  const positives = results.filter((r) => r.playerIndex === playerIndex && r.vote === 'positive')
  const tally     = new Map<string, number>()

  for (const r of positives) {
    const item = rounds[r.roundIndex]?.items[0] as IdolItem | SongItem | undefined
    if (item?.groupName) tally.set(item.groupName, (tally.get(item.groupName) ?? 0) + 1)
  }

  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([groupName, count]) => ({ groupName, count }))
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

/** Bloc de stats d'un joueur. */
function PlayerStatsBlock({
  name,
  stats,
  topGroups,
  rateLabel,
  positiveLabel,
  negativeLabel,
  isP2 = false,
}: {
  name:          string
  stats:         ReturnType<typeof computePlayerStats>
  topGroups:     Array<{ groupName: string; count: number }>
  rateLabel:     string
  positiveLabel: string
  negativeLabel: string
  isP2?:         boolean
}) {
  return (
    <div className={[styles.playerStats, isP2 ? styles.playerStats__p2 : ''].join(' ')}>
      <p className={styles.playerName}>{name}</p>
      <div className={styles.counters}>
        <div className={styles.counter}>
          <span className={`${styles.counterValue} ${styles.counterPositive}`}>{stats.positive}</span>
          <span className={styles.counterLabel}>{positiveLabel}</span>
        </div>
        <div className={styles.counter}>
          <span className={`${styles.counterValue} ${styles.counterNegative}`}>{stats.negative}</span>
          <span className={styles.counterLabel}>{negativeLabel}</span>
        </div>
        <div className={styles.counter}>
          <span className={styles.counterValue}>{stats.rate}%</span>
          <span className={styles.counterLabel}>{rateLabel}</span>
        </div>
      </div>

      {topGroups.length > 0 && (
        <div className={styles.podium}>
          <p className={styles.podiumTitle}>🏆 Top groupes</p>
          {topGroups.map((g, i) => (
            <div key={g.groupName} className={styles.podiumRow}>
              <span className={styles.podiumRank}>{i + 1}</span>
              <span className={styles.podiumName}>{g.groupName}</span>
              <span className={styles.podiumCount}>{g.count}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Card d'un round dans le récap. */
function RoundReviewCard({ item, vote, isTimeout, positiveLabel, negativeLabel }: {
  item:          IdolItem | SongItem
  vote:          'positive' | 'negative'
  isTimeout:     boolean
  positiveLabel: string
  negativeLabel: string
}) {
  const img = getItemImage(item)
  return (
    <div className={[
      styles.reviewCard,
      vote === 'positive' ? styles.reviewCardPositive : styles.reviewCardNegative,
    ].join(' ')}>
      <div className={[styles.reviewImg, item.type === 'idol' ? styles.reviewImgPortrait : styles.reviewImgThumb].join(' ')}>
        {img ? <img src={img} alt={getItemLabel(item)} /> : <div className={styles.reviewImgPlaceholder} />}
      </div>
      <div className={styles.reviewInfo}>
        <p className={styles.reviewLabel}>{getItemLabel(item)}</p>
        <p className={styles.reviewGroupName}>{item.groupName}</p>
      </div>
      <span className={vote === 'positive' ? styles.voteBadgePositive : styles.voteBadgeNegative}>
        {vote === 'positive' ? positiveLabel : negativeLabel}
        {isTimeout && <span className={styles.timeoutMark}> ⏱</span>}
      </span>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function QuickVoteSummary({
  rounds,
  results,
  config,
  onRestart,
  onBackToConfig,
}: QuickVoteSummaryProps) {
  const twoPlayer  = config.twoPlayerMode
  const p1Name     = config.player1Name || 'Joueur 1'
  const p2Name     = config.player2Name || 'Joueur 2'
  const voteLabels = QUICK_VOTE_LABELS[config.category]

  // Label du taux positif selon la catégorie
  const rateLabel = config.category === 'idols' ? 'Smash rate' : 'Top rate'

  const p1Stats     = computePlayerStats(results, 0)
  const p2Stats     = twoPlayer ? computePlayerStats(results, 1) : null
  const p1TopGroups = computeTopGroups(rounds, results, 0)
  const p2TopGroups = twoPlayer ? computeTopGroups(rounds, results, 1) : []

  return (
    <div className={styles.root}>
      <div className={styles.inner}>

        {/* Titre */}
        <div className={styles.header}>
          <h2 className={styles.title}>Quick Vote — {voteLabels.title}</h2>
          <p className={styles.subtitle}>{rounds.length} rounds joués</p>
        </div>

        {/* Stats joueurs */}
        <div className={[styles.statsRow, twoPlayer ? styles.statsRowTwoPlayer : ''].join(' ')}>
          <PlayerStatsBlock
            name={twoPlayer ? p1Name : 'Résultats'}
            stats={p1Stats}
            topGroups={p1TopGroups}
            rateLabel={rateLabel}
            positiveLabel={voteLabels.positive}
            negativeLabel={voteLabels.negative}
          />
          {twoPlayer && p2Stats && (
            <PlayerStatsBlock
              name={p2Name}
              stats={p2Stats}
              topGroups={p2TopGroups}
              rateLabel={rateLabel}
              positiveLabel={voteLabels.positive}
              negativeLabel={voteLabels.negative}
              isP2
            />
          )}
        </div>

        {/* Récap round par round */}
        <div className={styles.roundReview}>
          <p className={styles.reviewTitle}>Récapitulatif</p>
          {rounds.map((round, idx) => {
            const item     = round.items[0] as IdolItem | SongItem | undefined
            if (!item) return null
            const p1Result = results.find((r) => r.roundIndex === idx && r.playerIndex === 0)
            const p2Result = twoPlayer ? results.find((r) => r.roundIndex === idx && r.playerIndex === 1) : undefined

            return (
              <div key={idx} className={styles.reviewGroup}>
                <p className={styles.reviewRoundLabel}>Round {round.roundNumber}</p>
                {p1Result && (
                  <div className={twoPlayer ? styles.reviewPlayerRow : undefined}>
                    {twoPlayer && <span className={styles.reviewPlayerName}>{p1Name}</span>}
                    <RoundReviewCard
                      item={item}
                      vote={p1Result.vote}
                      isTimeout={p1Result.isTimeout}
                      positiveLabel={voteLabels.positive}
                      negativeLabel={voteLabels.negative}
                    />
                  </div>
                )}
                {twoPlayer && p2Result && (
                  <div className={styles.reviewPlayerRow}>
                    <span className={styles.reviewPlayerName}>{p2Name}</span>
                    <RoundReviewCard
                      item={item}
                      vote={p2Result.vote}
                      isTimeout={p2Result.isTimeout}
                      positiveLabel={voteLabels.positive}
                      negativeLabel={voteLabels.negative}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className="btn btn--secondary" onClick={onBackToConfig}>← Configuration</button>
          <button className="btn btn--primary"   onClick={onRestart}>↺ Rejouer</button>
        </div>

      </div>
    </div>
  )
}
