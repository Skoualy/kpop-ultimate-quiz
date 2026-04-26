import type { MemberRole } from '@/shared/models'
import { SegmentedControlOption } from '../Controls/SegmentedControl'

export type GamePlayMode = 'classic' | 'chill' | 'spectator' | 'hardcore' | 'custom'

export interface GamePlayModeConfig {
  value: GamePlayMode
  label: string
  timerEditable: boolean // dropdown timer activable
  timerDefault: number // 0 = pas de timer
  clipEditable: boolean // input clip éditable
  clipDefault: number
  autoNext: boolean // round suivant auto
  canReplay: boolean // rejouer extrait
  revealOnTimerEnd: boolean // révélation auto fin timer
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

/** Valeurs du dropdown Timer */
export const TIMER_OPTIONS: SegmentedControlOption[] = [
  { value: '0', label: 'Aucun' },
  { value: '5', label: '5s' },
  { value: '10', label: '10s' },
  { value: '15', label: '15s' },
  { value: '20', label: '20s' },
  // { value: '25', label: '25s' },
  // { value: '30', label: '30s' },
]

export const QUIZ_TYPES_OPTIONS: SegmentedControlOption[] = [
  { value: 'saveOne', label: 'Save One' },
  { value: 'quickVote', label: 'Quick Vote' },
  { value: 'blindTest', label: 'Blind Test' },
  { value: 'tournament', label: 'Tournoi', disabled: true },
]

export const QUIZ_CATEGORIES_OPTIONS: SegmentedControlOption[] = [
  { value: 'idols', label: 'Idoles' },
  { value: 'songs', label: 'Chansons' },
]

/** Valeurs du dropdown Drops */
export const DROPS_OPTIONS: SegmentedControlOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
]

/**
 * Retourne les rôles affichables selon le critère.
 * - leadership → leader uniquement
 * - performance → rôles de scène (sans leader, visual, maknae)
 * - autres → tous
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
