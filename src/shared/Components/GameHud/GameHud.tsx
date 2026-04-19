import type { GameHudProps } from './GameHud.types'
import styles from './GameHud.module.scss'

/**
 * HUD générique pour tous les modes de quiz.
 *
 * Card divisée en 2 sections horizontales :
 *   Section 1 — infos principales : type · round · mode
 *   Section 2 — options : drops, timer, extrait + critère (badge) + 2J
 */
export function GameHud({
  quizType,
  category,
  gameMode,
  currentRound,
  totalRounds,
  options,
  criterion,
  twoPlayer = false,
}: GameHudProps) {
  const visibleOptions = options.filter(Boolean) as NonNullable<(typeof options)[number]>[]

  return (
    <div className={styles.card}>

      {/* ── Section 1 : infos principales ── */}
      <div className={styles.section1}>
        <span className={[styles.typeTag, styles.typeTagAccent].join(' ')}>{quizType}</span>
        <span className={styles.typeTag}>{category}</span>
        <span className={styles.sep} aria-hidden>·</span>
        <div className={styles.roundBadge} aria-label={`Round ${currentRound} sur ${totalRounds}`}>
          <span className={styles.roundLabel}>Round</span>
          <span className={styles.roundVal}>{currentRound}</span>
          <span className={styles.roundTotal}>/ {totalRounds}</span>
        </div>
        <span className={styles.sep} aria-hidden>·</span>
        <span className={styles.modeTag}>{gameMode}</span>
      </div>

      {/* ── Section 2 : options ── */}
      <div className={styles.section2}>
        {/* Options drops/timer/extrait */}
        {visibleOptions.map((opt) => (
          <span key={opt.label} className={styles.opt}>
            <span className={styles.optLabel}>{opt.label}</span>
            <span className={styles.optVal}>{opt.value}</span>
          </span>
        ))}

        {/* Séparateur si options + extras */}
        {visibleOptions.length > 0 && (criterion || twoPlayer) && (
          <span className={styles.sep2} aria-hidden>·</span>
        )}

        {/* Critère — style badge gradient comme CriterionBadge */}
        {criterion && (
          <span className={styles.criterionBadge}>
            <span className={styles.criterionIcon}>🎯</span>
            <span className={styles.criterionText}>Critère · {criterion}</span>
          </span>
        )}

        {/* Indicateur 2 joueurs */}
        {twoPlayer && (
          <span className={styles.twoPlayerTag}>👥 2 Joueurs</span>
        )}
      </div>

    </div>
  )
}
