import type { SaveOneCriterion } from '@/shared/models'

/**
 * Liste des critères de jeu utilisables comme options de filtre.
 * N'inclut PAS 'all' — cette option est gérée par allOptionLabel dans BadgeGroupControl.
 */
export const CRITERIA: Array<Exclude<SaveOneCriterion, 'all'>> = [
  'beauty',
  'personality',
  'voice',
  'performance',
  'leadership',
  'aegyo',
  'random',
]

/** Labels d'affichage pour tous les critères (incluant 'all' pour le stockage config). */
export const CRITERIA_LABELS: Record<SaveOneCriterion, string> = {
  all:         'Tous',
  beauty:      'Beauté',
  personality: 'Personnalité',
  voice:       'Voix',
  performance: 'Performance',
  leadership:  'Leadership',
  aegyo:       'Aegyo',
  random:      'Aléatoire',
}
