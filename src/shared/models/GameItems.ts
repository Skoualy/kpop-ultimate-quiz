import type { Idol } from './Idol'
import type { SongEntry } from './SongEntry'
import type { MemberRole } from './enums'

export interface SongWithGroup {
  groupId: string
  groupName: string
  song: SongEntry
}

export interface IdolWithGroup {
  groupId: string
  groupName: string
  idol: Idol
  roles: MemberRole[]
  //status: MemberStatus
}