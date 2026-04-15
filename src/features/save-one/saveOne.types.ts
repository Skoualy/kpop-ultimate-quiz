import type { Idol, SongEntry } from '@/shared/models'

export interface IdolPoolEntry {
  id: string
  groupId: string
  groupName: string
  idol: Idol
  isFormerMember: boolean
}

export interface SongPoolEntry {
  id: string
  groupId: string
  groupName: string
  song: SongEntry
  youtubeId: string | null
  thumbnailUrl: string
  previewStartSeconds: number
}

export type SaveOneRoundChoice = IdolPoolEntry | SongPoolEntry

export interface SaveOneRound {
  index: number
  choices: SaveOneRoundChoice[]
}

export interface PlayerRoundResult {
  choiceId: string | null
  choiceLabel: string
  groupName: string | null
  timeout: boolean
  decisionMs: number | null
}

export interface SaveOneRoundResult {
  roundIndex: number
  players: PlayerRoundResult[]
}
