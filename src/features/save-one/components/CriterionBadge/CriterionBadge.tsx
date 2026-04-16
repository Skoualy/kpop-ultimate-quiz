import type { SaveOneCriterion } from '@/shared/models'
import styles from './CriterionBadge.module.scss'

const CRITERION_LABELS: Record<SaveOneCriterion, string> = {
  all: 'Tout',
  beauty: 'Beauté',
  personality: 'Personnalité',
  voice: 'Voix',
  performance: 'Performance',
  leadership: 'Leadership',
  aegyo: 'Aegyo',
  random: 'Aléatoire',
}

const CRITERION_EMOJI: Record<SaveOneCriterion, string> = {
  all: '✨',
  beauty: '💄',
  personality: '💬',
  voice: '🎤',
  performance: '🎭',
  leadership: '👑',
  aegyo: '🌸',
  random: '🎲',
}

interface CriterionBadgeProps {
  criterion: SaveOneCriterion
}

export function CriterionBadge({ criterion }: CriterionBadgeProps) {
  if (criterion === 'all') return null // no badge needed for "all"

  return (
    <div className={styles.badge}>
      <span className={styles.emoji}>{CRITERION_EMOJI[criterion]}</span>
      <span className={styles.label}>Critère · {CRITERION_LABELS[criterion]}</span>
    </div>
  )
}
