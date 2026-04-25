import type { QuizCategory } from '@/shared/models'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuickVoteLabel {
  /** Titre affiché dans le HUD et le résumé : "Smash or Pass", "Top or Flop" */
  title?: string
  /** Label du vote positif : "Smash", "Top" */
  positive: string
  /** Label du vote négatif : "Pass", "Flop" */
  negative: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/**
 * Labels contextuels du mode Smash or Pass selon la catégorie.
 * Le nom du mode reste toujours "Smash or Pass" dans la config,
 * mais le wording des boutons et du titre de round s'adapte.
 */
// export const QUICK_VOTE_LABELS: Record<QuizCategory, QuickVoteLabel> = {
//   idols: { title: 'Smash or Pass', positive: 'Smash', negative: 'Pass' },
//   songs: { title: 'Top or Flop', positive: 'Top', negative: 'Flop' },
// }

export const QUICK_VOTE_LABELS: QuickVoteLabel = {
  title: 'Smash or Pass',
  positive: 'Smash',
  negative: 'Pass',
}
