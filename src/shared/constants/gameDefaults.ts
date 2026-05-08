import type { GameConfig } from '@/shared/models'

// ─── Blind Test — tolérance de matching ──────────────────────────────────────

export const BLIND_TEST_MATCH_THRESHOLDS = {
  permissive: 0.8,
  tolerant: 0.9,
  strict: 1.0,
} as const

export type AnswerTolerance = keyof typeof BLIND_TEST_MATCH_THRESHOLDS

export const ANSWER_TOLERANCE_OPTIONS: { value: AnswerTolerance; label: string }[] = [
  { value: 'permissive', label: 'Permissif (≥ 80%)' },
  { value: 'tolerant', label: 'Tolérant (≥ 90%)' },
  { value: 'strict', label: 'Strict (100%)' },
]

// ─── Config par défaut ────────────────────────────────────────────────────────

export const DEFAULT_GAME_CONFIG: GameConfig = {
  mode: 'saveOne',
  gamePlayMode: 'classic',
  category: 'idols',
  rounds: 10,
  timerSeconds: 15,
  clipDuration: 10,
  drops: 2,
  criterion: 'all',
  roleFilters: [],
  songType: 'all',
  songLanguage: 'all',
  twoPlayerMode: false,
  player1Name: 'Joueur 1',
  player2Name: 'Joueur 2',
  selectedGroupIds: [],
  answerTolerance: 'tolerant',
}
