import type { Group } from './Group'
import type { Idol } from './Idol'
import type { MemberStatus, MemberRole, NationalityCode } from './enums'

export interface ContributionBundleMeta {
  schemaVersion: number
  generatedAt: string
}

export interface ContributionBundle {
  meta: ContributionBundleMeta
  group: Group
  idols: Idol[]
}

// UI-only — jamais persisté dans le dataset final
export interface EditableMemberRow {
  idol: {
    id?: string
    name: string
    primaryGroupId?: string
    nationality: NationalityCode
    portrait?: string | null
    notes?: string | null
  }
  membership: {
    status: MemberStatus
    roles: MemberRole[]
  }
  idolResolution: {
    mode: 'existing' | 'new'
    selectedExistingId?: string | null
    resolvedId?: string | null
  }
}
