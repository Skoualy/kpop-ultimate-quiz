import type { QuizMode, QuizCategory, SongType, SaveOneCriterion, MemberRole } from './enums'
import type { SongEntry } from './SongEntry'
import type { Idol } from './Idol'
import type { Group } from './Group'
import type { MemberStatus } from './enums'

export type GamePlayMode = 'classic' | 'chill' | 'spectator' | 'hardcore' | 'custom'

export interface GameConfig {
  mode:             QuizMode
  gamePlayMode:     GamePlayMode
  category:         QuizCategory
  rounds:           number
  /** Secondes — 0 signifie "pas de timer" */
  timerSeconds:     number
  clipDuration:     number
  drops:            number
  criterion:        SaveOneCriterion
  /** Multi-select — tableau vide = tous les rôles */
  roleFilters:      MemberRole[]
  songType:         SongType
  twoPlayerMode:    boolean
  player1Name:      string
  player2Name:      string
  selectedGroupIds: string[]
}

// ─── Types gameplay dérivés ───────────────────────────────────────────────────

export interface IdolGameItem {
  type:         'idol'
  idol:         Idol
  group:        Group
  memberStatus: MemberStatus
}

export interface SongGameItem {
  type:  'song'
  song:  SongEntry
  group: Group
}

export type GameItem = IdolGameItem | SongGameItem
