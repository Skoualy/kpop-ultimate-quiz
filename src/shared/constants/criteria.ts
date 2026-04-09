import type { SaveOneCriterion } from '@/shared/models'

export const CRITERIA: SaveOneCriterion[] = [
  'all', 'beauty', 'personality', 'voice', 'performance', 'leadership', 'aegyo', 'random',
]

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

export const CRITERIA_DESCRIPTIONS: Record<SaveOneCriterion, string> = {
  all:         'Comparaison globale classique',
  beauty:      'Comparaison orientée apparence / attractivité visuelle',
  personality: 'Comparaison orientée vibe, humour, attitude, ressenti global',
  voice:       'Comparaison centrée sur la voix',
  performance: 'Comparaison de profils similaires (chant / danse / rap)',
  leadership:  'Réservé aux idoles ayant le rôle Leader',
  aegyo:       'Comparaison centrée sur le charme et la mignonnerie',
  random:      'Critère tiré aléatoirement à chaque round',
}
