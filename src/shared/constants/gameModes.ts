import type { MemberRole, GamePlayMode, SongType } from '@/shared/models'
import type { SegmentedControlOption } from '@/shared/Controls/SegmentedControl'

// Re-export pour accès depuis '@/shared/constants' (compatibilité imports existants)
export type { GamePlayMode }

export interface GamePlayModeConfig {
  value: GamePlayMode
  label: string
  timerEditable: boolean // timer dropdown activable
  timerDefault: number // 0 = pas de timer
  clipEditable: boolean // durée extrait éditable
  clipDefault: number
  autoNext: boolean // round suivant auto
  canReplay: boolean // rejouer extrait
  revealOnTimerEnd: boolean // révélation auto à la fin du timer
  xpMultiplier: number
  showAdvancedOptions: boolean // affiche la section "Options supplémentaires"
}

export const GAME_PLAY_MODES: GamePlayModeConfig[] = [
  {
    value: 'classic',
    label: 'Classique',
    timerEditable: true,
    timerDefault: 15,
    clipEditable: true,
    clipDefault: 10,
    autoNext: true,
    canReplay: true,
    revealOnTimerEnd: true,
    xpMultiplier: 1,
    showAdvancedOptions: false,
  },
  {
    value: 'chill',
    label: 'Chill',
    timerEditable: false,
    timerDefault: 0, // pas de timer — forcé
    clipEditable: true,
    clipDefault: 15,
    autoNext: false,
    canReplay: true,
    revealOnTimerEnd: false,
    xpMultiplier: 0.5,
    showAdvancedOptions: false,
  },
  {
    value: 'spectator',
    label: 'Spectateur',
    timerEditable: true,
    timerDefault: 0, // pas de timer par défaut mais éditable
    clipEditable: true,
    clipDefault: 10,
    autoNext: false,
    canReplay: true,
    revealOnTimerEnd: true,
    xpMultiplier: 0,
    showAdvancedOptions: false,
  },
  {
    value: 'hardcore',
    label: 'Hardcore',
    timerEditable: false,
    timerDefault: 10, // imposé
    clipEditable: false,
    clipDefault: 5, // imposé
    autoNext: true,
    canReplay: false,
    revealOnTimerEnd: true,
    xpMultiplier: 2,
    showAdvancedOptions: false,
  },
  {
    value: 'custom',
    label: 'Personnalisé',
    timerEditable: true,
    timerDefault: 15,
    clipEditable: true,
    clipDefault: 10,
    autoNext: false,
    canReplay: true,
    revealOnTimerEnd: false,
    xpMultiplier: 1,
    showAdvancedOptions: true, // déverrouille les options supplémentaires
  },
]

export const GAME_PLAY_MODE_MAP: Record<GamePlayMode, GamePlayModeConfig> = Object.fromEntries(
  GAME_PLAY_MODES.map((m) => [m.value, m]),
) as Record<GamePlayMode, GamePlayModeConfig>

/** Valeurs du SegmentedControl Timer */
export const TIMER_OPTIONS: SegmentedControlOption[] = [
  { value: '0', label: 'Aucun' },
  { value: '5', label: '5s' },
  { value: '10', label: '10s' },
  { value: '15', label: '15s' },
  { value: '20', label: '20s' },
]

/** Valeurs du SegmentedControl Drops */
export const DROPS_OPTIONS: SegmentedControlOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
]

/** Options de type de quiz pour SelectControl */
export const QUIZ_TYPES_OPTIONS: SegmentedControlOption[] = [
  { value: 'saveOne', label: 'Save One' },
  { value: 'quickVote', label: 'Smash Or Pass' },
  { value: 'blindTest', label: 'Blind Test' },
  { value: 'tournament', label: 'Tournoi (bientôt disponible)', disabled: true },
]

/** Options de catégorie pour SelectControl */
export const QUIZ_CATEGORIES_OPTIONS: SegmentedControlOption[] = [
  { value: 'idols', label: 'Idoles' },
  { value: 'songs', label: 'Chansons' },
]

/**
 * Options de type de chansons pour BadgeGroupControl.
 * N'inclut PAS 'all' — à passer via allOptionLabel="Tous".
 */
export const SONG_TYPE_OPTIONS: { value: Exclude<SongType, 'all'>; label: string }[] = [
  { value: 'titles', label: 'Titles' },
  { value: 'bSides', label: 'B-sides' },
  { value: 'debutSongs', label: 'Debut songs' },
]

export const SONG_TYPE_OPTIONS_MAP: Record<SongType, { value: SongType; label: string }> = Object.fromEntries(
  SONG_TYPE_OPTIONS.map((m) => [m.value, m]),
) as Record<SongType, { value: SongType; label: string }>

/**
 * Retourne les rôles affichables selon le critère sélectionné.
 * - leadership → leader uniquement
 * - performance → rôles de scène (sans leader, visual, maknae)
 * - autres → tous les rôles
 */
export function getAvailableRolesForCriterion(criterion: string, allRoles: MemberRole[]): MemberRole[] {
  if (criterion === 'leadership') return allRoles.filter((r) => r === 'leader')
  if (criterion === 'performance') {
    return allRoles.filter((r) => !(['leader', 'visual', 'maknae'] as MemberRole[]).includes(r))
  }
  return allRoles
}

/**
 * Nettoie la sélection de rôles en retirant ceux qui ne sont plus disponibles
 * après un changement de critère.
 */
export function filterRolesForCriterion(
  selected: MemberRole[],
  criterion: string,
  allRoles: MemberRole[],
): MemberRole[] {
  const available = getAvailableRolesForCriterion(criterion, allRoles)
  return selected.filter((r) => available.includes(r))
}
