import type { MemberRole, NationalityCode, MemberStatus, GroupCategory } from '@/shared/models'
import { slugify } from '@/shared/utils/slug'

export interface EditableMember {
  _uiKey: string
  name: string
  nationality: NationalityCode
  roles: MemberRole[]
  portrait: string
  portraitFile: File | null
  status: MemberStatus
  resolutionMode: 'new' | 'existing'
  existingIdolId: string | null
  generatedId: string
}

export function emptyMember(status: MemberStatus = 'current'): EditableMember {
  return {
    _uiKey: Math.random().toString(36).slice(2),
    name: '',
    nationality: 'kr',
    roles: [],
    portrait: '',
    portraitFile: null,
    status,
    resolutionMode: 'new',
    existingIdolId: null,
    generatedId: '',
  }
}

export function resetMember(member: EditableMember): EditableMember {
  return {
    ...member,
    name: '',
    nationality: 'kr',
    roles: [],
    portrait: '',
    portraitFile: null,
    resolutionMode: 'new',
    existingIdolId: null,
    generatedId: '',
  }
}

export function getMemberPlaceholderByCategory(groupCategory: GroupCategory): string {
  if (groupCategory === 'boyGroup' || groupCategory === 'maleSoloist') {
    return '/assets/placeholders/idol-male.webp'
  }

  return '/assets/placeholders/idol-female.webp'
}

export function buildUniqueIdolId(name: string, usedIds: string[]): string {
  const base = slugify(name.trim())
  if (!base) return ''

  if (!usedIds.includes(base)) return base

  let i = 2
  while (usedIds.includes(`${base}-${i}`)) {
    i += 1
  }

  return `${base}-${i}`
}

interface ValidateMembersOptions {
  isSoloist?: boolean
  isSubunit?: boolean
}

export function validateMembers(
  members: EditableMember[],
  { isSoloist = false, isSubunit = false }: ValidateMembersOptions = {},
): string[] {
  const errors: string[] = []
  const current = members.filter((m) => m.status === 'current')

  if (current.length === 0) errors.push('Au moins un membre actuel est requis')

  for (const m of members) {
    if (!m.name.trim()) {
      errors.push("Un membre n'a pas de nom de scène")
      break
    }
  }

  if (isSubunit) {
    return errors
  }

  if (isSoloist) {
    const soloist = current[0]
    if (soloist && !soloist.roles.some((r) => r === 'vocal' || r === 'rapper')) {
      errors.push('Un soloist doit avoir au moins le rôle vocal ou rapper')
    }
    return errors
  }

  for (const m of members) {
    if (m.roles.length === 0) {
      errors.push(`"${m.name.trim() || 'Un membre'}" doit avoir au moins un rôle`)
    }
  }

  return [...new Set(errors)]
}
