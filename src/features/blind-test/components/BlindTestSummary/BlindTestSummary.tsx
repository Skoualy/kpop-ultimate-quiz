import type { ReactNode } from 'react'
import { GameSummary, type SummaryRound } from '@/shared/Components/GameSummary'
import type { BlindTestResult, PlayerIndex } from '../../BlindTestPage.types'
import type { SongItem } from '@/features/save-one/SaveOnePage.types'
import type { BlindTestSummaryProps } from './BlindTestSummary.types'
import styles from './BlindTestSummary.module.scss'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundLabel(artistMatched: boolean, titleMatched: boolean, foundInOneTry: boolean): string {
  if (foundInOneTry) return '⚡ Bonne réponse !'
  if (artistMatched && titleMatched) return '✅ Bonne réponse'
  if (artistMatched || titleMatched) return '🟡 Réponse incomplète'
  return '❌ Non trouvée'
}

function totalScore(results: BlindTestResult[], playerIndex: PlayerIndex): number {
  return results
    .filter((r) => r.playerIndex === playerIndex)
    .reduce((sum, r) => sum + r.scoreGained, 0)
}

function avgTimeMs(results: BlindTestResult[], playerIndex: PlayerIndex): number | null {
  const timed = results.filter((r) => r.playerIndex === playerIndex && r.timeMs !== null)
  if (timed.length === 0) return null
  return timed.reduce((s, r) => s + r.timeMs!, 0) / timed.length
}

// ─── Carte résultat d'un round ────────────────────────────────────────────────

function RoundResultCard({ result, song }: { result: BlindTestResult | undefined; song: SongItem }) {
  const artist = result?.artistMatched ?? false
  const title  = result?.titleMatched  ?? false
  const one    = result?.foundInOneTry ?? false

  return (
    <div className={styles.resultCard}>
      <img src={song.thumbnailUrl} alt={song.title} className={styles.thumb} />
      <div className={styles.info}>
        <span className={[styles.label, one ? styles.labelGold : artist && title ? styles.labelGreen : artist || title ? styles.labelAmber : styles.labelRed].join(' ')}>
          {roundLabel(artist, title, one)}
        </span>
        <span className={[styles.badge, artist ? styles.badgeGreen : styles.badgeRed].join(' ')}>
          Artiste : {artist ? song.groupName + ' ✅' : '???'}
        </span>
        <span className={[styles.badge, title ? styles.badgeGreen : styles.badgeRed].join(' ')}>
          Titre : {title ? song.title + ' ✅' : '???'}
        </span>
        {result && result.timeMs !== null && (
          <span className={styles.time}>⏱ {(result.timeMs / 1000).toFixed(1)}s</span>
        )}
      </div>
      {result && (
        <span className={styles.score}>{result.scoreGained} pt{result.scoreGained > 1 ? 's' : ''}</span>
      )}
    </div>
  )
}

// ─── Colonne stats joueur ─────────────────────────────────────────────────────

function PlayerStats({ results, playerIndex }: { results: BlindTestResult[]; playerIndex: PlayerIndex }): ReactNode {
  const mine        = results.filter((r) => r.playerIndex === playerIndex)
  const total       = mine.reduce((s, r) => s + r.scoreGained, 0)
  const complete    = mine.filter((r) => r.artistMatched && r.titleMatched).length
  const artists     = mine.filter((r) => r.artistMatched).length
  const titles      = mine.filter((r) => r.titleMatched).length
  const oneShot     = mine.filter((r) => r.foundInOneTry).length
  const n           = mine.length

  return (
    <div className={styles.statsCol}>
      <div className={styles.statRow}>
        <span className={styles.statIcon}>🏆</span>
        <span className={styles.statVal}>{total}</span>
        <span className={styles.statLabel}>pts</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statIcon}>✅</span>
        <span className={styles.statVal}>{complete}/{n}</span>
        <span className={styles.statLabel}>complètes</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statIcon}>🎤</span>
        <span className={styles.statVal}>{artists}/{n}</span>
        <span className={styles.statLabel}>artistes</span>
      </div>
      <div className={styles.statRow}>
        <span className={styles.statIcon}>🎵</span>
        <span className={styles.statVal}>{titles}/{n}</span>
        <span className={styles.statLabel}>titres</span>
      </div>
      {oneShot > 0 && (
        <div className={styles.statRow}>
          <span className={styles.statIcon}>⚡</span>
          <span className={styles.statVal}>{oneShot}/{n}</span>
          <span className={styles.statLabel}>1er coup</span>
        </div>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function BlindTestSummary({ rounds, results, config, onRestart, onBackToConfig }: BlindTestSummaryProps) {
  const twoPlayer = config.twoPlayerMode
  const p1Name    = config.player1Name || 'Joueur 1'
  const p2Name    = config.player2Name || 'Joueur 2'

  // Gagnant 2J (score, puis temps moyen)
  const commonChoicesLabel = twoPlayer ? '★ Même réponse !' : undefined
  const commonChoicesCount = twoPlayer
    ? rounds.reduce((acc, round, ri) => {
        const p1 = results.find((r) => r.roundIndex === ri && r.playerIndex === 0)
        const p2 = results.find((r) => r.roundIndex === ri && r.playerIndex === 1)
        if (p1 && p2 && p1.artistMatched === p2.artistMatched && p1.titleMatched === p2.titleMatched) return acc + 1
        return acc
      }, 0)
    : 0

  const p1Score  = totalScore(results, 0)
  const p2Score  = twoPlayer ? totalScore(results, 1) : 0
  const p1Avg    = avgTimeMs(results, 0)
  const p2Avg    = twoPlayer ? avgTimeMs(results, 1) : null

  // Sous-titre avec indication du gagnant en 2J
  let subtitle = `${rounds.length} rounds · Blind Test`
  if (twoPlayer) {
    if (p1Score > p2Score) subtitle += ` · 🏆 ${p1Name}`
    else if (p2Score > p1Score) subtitle += ` · 🏆 ${p2Name}`
    else if (p1Avg !== null && p2Avg !== null) {
      subtitle += ` · 🏆 ${p1Avg <= p2Avg ? p1Name : p2Name} (temps)`
    } else {
      subtitle += ' · Égalité !'
    }
  }

  // Rounds pour GameSummary
  const summaryRounds: SummaryRound[] = rounds.map((round, ri) => {
    const p1Res = results.find((r) => r.roundIndex === ri && r.playerIndex === 0)
    const p2Res = twoPlayer ? results.find((r) => r.roundIndex === ri && r.playerIndex === 1) : undefined

    const sameResult = twoPlayer && p1Res && p2Res
      && p1Res.artistMatched === p2Res.artistMatched
      && p1Res.titleMatched  === p2Res.titleMatched

    return {
      roundNumber: round.roundNumber,
      matchLabel:  sameResult ? '★ Même réponse !' : undefined,
      p1Content:   <RoundResultCard result={p1Res} song={round.song1} />,
      p2Content:   twoPlayer && round.song2
        ? <RoundResultCard result={p2Res} song={round.song2} />
        : undefined,
    }
  })

  return (
    <GameSummary
      title="Résumé de partie"
      subtitle={subtitle}
      onRestart={onRestart}
      onBackToConfig={onBackToConfig}
      twoPlayer={twoPlayer}
      p1Name={p1Name}
      p2Name={p2Name}
      commonChoicesCount={commonChoicesCount}
      commonChoicesLabel={commonChoicesLabel}
      p1Stats={<PlayerStats results={results} playerIndex={0} />}
      p2Stats={twoPlayer ? <PlayerStats results={results} playerIndex={1} /> : undefined}
      summaryRounds={summaryRounds}
    />
  )
}
