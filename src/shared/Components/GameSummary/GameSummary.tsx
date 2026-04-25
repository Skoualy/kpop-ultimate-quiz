import { useRef } from 'react'
import { ScrollTopControl } from '@/shared/Controls/ScrollTopControl'
import type { GameSummaryProps, SummaryRound } from './GameSummary.types'
import styles from './GameSummary.module.scss'

// ─── Round card ───────────────────────────────────────────────────────────────

function RoundCard({
  round,
  twoPlayer,
  p1Name,
  p2Name,
}: {
  round:     SummaryRound
  twoPlayer: boolean
  p1Name:    string
  p2Name:    string
}) {
  return (
    <div className={styles.roundCard}>
      <div className={styles.roundCardHeader}>
        <p className={styles.roundLabel}>Round {round.roundNumber}</p>
        {round.matchLabel && (
          <span className={styles.matchBanner}>{round.matchLabel}</span>
        )}
      </div>

      {twoPlayer && round.p2Content ? (
        <div className={styles.twoColLayout}>
          {/* Colonne J1 */}
          <div className={styles.playerCol}>
            <p className={styles.playerColLabel2}>{p1Name}</p>
            {round.p1Content}
          </div>

          <div className={styles.colDivider} aria-hidden />

          {/* Colonne J2 */}
          <div className={styles.playerCol}>
            <p className={[styles.playerColLabel2, styles.p2ColLabel].join(' ')}>{p2Name}</p>
            {round.p2Content}
          </div>
        </div>
      ) : (
        round.p1Content
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * GameSummary — résumé de fin de partie générique.
 *
 * Fournit le layout structurel identique pour tous les jeux :
 *   header sticky | stats card | rounds list
 *
 * Chaque jeu fournit :
 *   - p1Stats / p2Stats : ReactNode (⚡ fastest, 🏆 podium, 📊 smash rate…)
 *   - summaryRounds    : tableau avec le contenu rendu de chaque round
 */
export function GameSummary({
  title,
  subtitle,
  onRestart,
  onBackToConfig,
  twoPlayer,
  p1Name,
  p2Name,
  commonChoicesCount,
  commonChoicesLabel = 'choix en commun',
  p1Stats,
  p2Stats,
  summaryRounds,
}: GameSummaryProps) {
  const pageRef = useRef<HTMLDivElement>(null)

  const showCommonChoices = twoPlayer && !!commonChoicesCount && commonChoicesCount > 0

  return (
    <div className={styles.page} ref={pageRef}>

      {/* ── Header sticky ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={onBackToConfig}>← Config</button>
          <button className={styles.btnPrimary}   onClick={onRestart}>▶ Rejouer</button>
        </div>
      </div>

      {/* ── Stats card ── */}
      {(p1Stats || p2Stats) && (
        <div className={styles.statsCard}>
          {/* Bandeau choix communs (2J seulement) */}
          {showCommonChoices && (
            <div className={styles.commonChoices}>
              <span className={styles.commonChoicesIcon}>★</span>
              <span className={styles.commonChoicesVal}>{commonChoicesCount}</span>
              <span className={styles.commonChoicesLabel}>{commonChoicesLabel}</span>
            </div>
          )}

          {/* Colonnes stats */}
          <div className={twoPlayer ? styles.statsCols2P : styles.statsCols1P}>
            <div className={styles.playerStatCol}>
              {twoPlayer && (
                <p className={styles.playerColLabel}>{p1Name}</p>
              )}
              {p1Stats}
            </div>

            {twoPlayer && p2Stats && (
              <>
                <div className={styles.colDivider} aria-hidden />
                <div className={styles.playerStatCol}>
                  <p className={[styles.playerColLabel, styles.p2Label].join(' ')}>{p2Name}</p>
                  {p2Stats}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Rounds ── */}
      <div className={styles.rounds}>
        {summaryRounds.map((round) => (
          <RoundCard
            key={round.roundNumber}
            round={round}
            twoPlayer={twoPlayer}
            p1Name={p1Name}
            p2Name={p2Name}
          />
        ))}
      </div>

      <ScrollTopControl scrollTarget={pageRef.current} threshold={150} />
    </div>
  )
}
