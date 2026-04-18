import type { MemberRole, NationalityCode, MemberStatus, GroupCategory } from '@/shared/models'
import type { ImageCreditInput } from '@/shared/models/AssetCredit'
import { slugify } from '@/shared/utils/slug'
import { getIdolPlaceholderPath } from '@/shared/utils/assets'

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
  /** Informations de crédit pour le portrait de l'idole */
  portraitCredit: ImageCreditInput
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
    portraitCredit: {
      sourceType: 'wikimedia',
      originalFileName: null,
      sourceUrl: null,
      aiModified: false,
      transformReport: null,
    },
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
    portraitCredit: {
      sourceType: 'wikimedia',
      originalFileName: null,
      sourceUrl: null,
      aiModified: false,
      transformReport: null,
    },
  }
}

export function getMemberPlaceholderByCategory(groupCategory: GroupCategory): string {
  if (groupCategory === 'boyGroup' || groupCategory === 'maleSoloist') {
    return getIdolPlaceholderPath('m')
  }
  return getIdolPlaceholderPath('f')
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

export function validateMembers(members: EditableMember[], options: ValidateMembersOptions = {}): string[] {
  const errors: string[] = []
  const { isSoloist = false, isSubunit = false } = options

  if (isSubunit) return errors

  if (members.length === 0) {
    errors.push('Au moins un membre est requis')
    return errors
  }

  for (const m of members) {
    if (!m.name.trim()) errors.push('Tous les membres doivent avoir un nom')
    if (!isSoloist && m.roles.length === 0) errors.push(`${m.name || 'Un membre'} n'a aucun rôle attribué`)
    if (!m.generatedId && !m.existingIdolId) errors.push(`${m.name || 'Un membre'} n'a pas d'ID généré`)
  }

  return [...new Set(errors)]
}
