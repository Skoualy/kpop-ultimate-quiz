import { useRef } from 'react'
import { ScrollTopControl } from '@/shared/Controls/ScrollTopControl'
import type { IdolItem, RoundResult, SongItem } from '../../SaveOnePage.types'
import type { SaveOneSummaryProps } from './SaveOneSummary.types'
import styles from './SaveOneSummary.module.scss'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getItemId(item: IdolItem | SongItem): string {
  return item.type === 'idol' ? item.idolId : item.songId
}
function getItemLabel(item: IdolItem | SongItem): string {
  return item.type === 'idol' ? item.name : item.title
}
function getItemGroup(item: IdolItem | SongItem): string {
  return item.groupName
}
function getItemImage(item: IdolItem | SongItem): string | null {
  return item.type === 'idol' ? (item.portrait ?? null) : item.thumbnailUrl
}

function computeTopGroups(
  rounds: SaveOneSummaryProps['rounds'],
  results: RoundResult[],
): Array<{ groupName: string; count: number }> {
  const p1Results = results.filter((r) => r.playerIndex === 0 && r.chosenId)
  const tally     = new Map<string, number>()
  for (const result of p1Results) {
    const round = rounds[result.roundIndex]
    const item  = (round.items as (IdolItem | SongItem)[]).find((i) => getItemId(i) === result.chosenId)
    if (!item) continue
    tally.set(item.groupName, (tally.get(item.groupName) ?? 0) + 1)
  }
  const entries = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([groupName, count]) => ({ groupName, count }))
  if (entries.length === 0 || entries[0].count < 2) return []
  return entries.slice(0, 3)
}

function fastestChoice(
  rounds: SaveOneSummaryProps['rounds'],
  results: RoundResult[],
): { label: string; ms: number } | null {
  const timed = results.filter((r) => r.playerIndex === 0 && r.timeMs !== null && r.chosenId)
  if (timed.length === 0) return null
  const fastest = timed.reduce((a, b) => (b.timeMs! < a.timeMs! ? b : a))
  const round   = rounds[fastest.roundIndex]
  const item    = (round.items as (IdolItem | SongItem)[]).find((i) => getItemId(i) === fastest.chosenId)
  return item ? { label: getItemLabel(item), ms: fastest.timeMs! } : null
}

// ─── Micro-composant : une card item dans le résumé ──────────────────────────

function SummaryItemCard({
  item, isChosen, isPass, isTimeout,
}: {
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
            draggable={false}
          />
        ) : (
          <div className={styles.imgPlaceholder} />
        )}
        {isChosen && !isPass && !isTimeout && <span className={styles.chosenBadge}>✓</span>}
      </div>
      <p className={styles.summaryLabel}>{getItemLabel(item)}</p>
      <p className={styles.summaryGroup}>{getItemGroup(item)}</p>
      {isPass    && <span className={styles.statusPill + ' ' + styles.passPill}>⏭ Pass</span>}
      {isTimeout && <span className={styles.statusPill + ' ' + styles.timeoutPill}>⏱ Timeout</span>}
    </div>
  )
}

// ─── Round card 1 joueur ──────────────────────────────────────────────────────

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

// ─── Round card 2 joueurs — 2 colonnes ────────────────────────────────────────

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
        {/* Colonne J1 */}
        <div className={styles.playerCol}>
          <p className={styles.playerColLabel}>{p1Name}</p>
          <div className={styles.roundItems}>
            {items.map((item) => {
              const id = getItemId(item)
              return (
                <SummaryItemCard key={id} item={item}
                  isChosen={p1Id === id}
                  isPass={p1Id === id && p1Result?.isPass}
                  isTimeout={p1Id === id && p1Result?.isTimeout}
                />
              )
            })}
          </div>
        </div>

        {/* Séparateur vertical */}
        <div className={styles.colDivider} aria-hidden />

        {/* Colonne J2 */}
        <div className={styles.playerCol}>
          <p className={[styles.playerColLabel, styles.p2Label].join(' ')}>{p2Name}</p>
          <div className={styles.roundItems}>
            {items.map((item) => {
              const id = getItemId(item)
              return (
                <SummaryItemCard key={id} item={item}
                  isChosen={p2Id === id}
                  isPass={p2Id === id && p2Result?.isPass}
                  isTimeout={p2Id === id && p2Result?.isTimeout}
                />
              )
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
  const topGroups = computeTopGroups(rounds, results)
  const fastest   = fastestChoice(rounds, results)
  const p1Name    = config.player1Name || 'Joueur 1'
  const p2Name    = config.player2Name || 'Joueur 2'

  // Ref transmis au ScrollTopControl pour surveiller le scroll de CETTE div
  const pageRef = useRef<HTMLDivElement>(null)

  return (
    <div className={styles.page} ref={pageRef}>

      {/* ── Header avec actions ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Résumé de partie</h1>
          <p className={styles.subtitle}>
            {rounds.length} rounds · Save One · {config.category === 'idols' ? 'Idoles' : 'Chansons'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={onBackToConfig}>← Config</button>
          <button className={styles.btnPrimary}   onClick={onRestart}>▶ Rejouer</button>
        </div>
      </div>

      {/* ── Rounds ── */}
      <div className={styles.rounds}>
        {rounds.map((round) => {
          const p1 = results.find((r) => r.roundIndex === round.roundNumber - 1 && r.playerIndex === 0)
          const p2 = results.find((r) => r.roundIndex === round.roundNumber - 1 && r.playerIndex === 1)
          return twoPlayer ? (
            <RoundCard2P key={round.roundNumber} round={round} p1Result={p1} p2Result={p2} p1Name={p1Name} p2Name={p2Name} />
          ) : (
            <RoundCard1P key={round.roundNumber} round={round} result={p1} />
          )
        })}
      </div>

      {/* ── Stats ── */}
      {(fastest || topGroups.length > 0) && (
        <div className={styles.stats}>
          {fastest && (
            <div className={styles.statCard}>
              <p className={styles.statIcon}>⚡</p>
              <p className={styles.statValue}>{(fastest.ms / 1000).toFixed(1)}s</p>
              <p className={styles.statLabel}>Choix le plus rapide</p>
              <p className={styles.statSub}>{fastest.label}</p>
            </div>
          )}
          {topGroups.length > 0 && (
            <div className={styles.statCard}>
              <p className={styles.statIcon}>🏆</p>
              <p className={styles.statLabel}>Groupes favoris</p>
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
        </div>
      )}

      {/* Bouton scroll-to-top — apparaît uniquement quand on scrolle dans la page résumé */}
      <ScrollTopControl scrollTarget={pageRef.current} threshold={150} />
    </div>
  )
}
