import type { MemberRole, SaveOneCriterion } from '@/shared/models'

export type PlayerIndex = 0 | 1

export type GamePhase =
  | 'loading'
  | 'roundTransition'
  | 'playing'
  | 'playerTransition'
  | 'summary'

export interface IdolItem {
  type: 'idol'
  idolId: string
  name: string
  groupId: string
  groupName: string
  portrait: string | null
  isFormer: boolean
  roles: MemberRole[]
}

export interface SongItem {
  type: 'song'
  songId: string
  title: string
  groupId: string
  groupName: string
  youtubeId: string
  thumbnailUrl: string
  startTime: number
  endTime: number
}

export type GameItem = IdolItem | SongItem

export interface RoundData {
  roundNumber: number
  items: IdolItem[] | SongItem[]
  /** Critère actif pour ce round (résolu depuis 'random' si applicable) */
  activeCriterion: SaveOneCriterion
}

export interface RoundResult {
  roundIndex: number
  playerIndex: PlayerIndex
  chosenId: string | null
  isTimeout: boolean
  isPass: boolean
  timeMs: number | null
}
