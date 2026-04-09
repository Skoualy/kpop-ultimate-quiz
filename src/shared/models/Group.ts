import type { GroupCategory, GroupStatus, Generation } from './enums'
import type { GroupMember } from './GroupMember'
import type { Discography } from './Discography'

export interface Group {
  id: string
  name: string
  category: GroupCategory
  parentGroupId: string | null
  generation: Generation
  debutYear: number
  status: GroupStatus
  company: string
  coverImage?: string | null
  members: GroupMember[]
  discography: Discography
  fandomName?: string | null
  notes?: string | null
}
