import type { MemberRole, MemberStatus } from './enums'

export interface GroupMember {
  idolId: string
  status: MemberStatus
  roles: MemberRole[]
}
