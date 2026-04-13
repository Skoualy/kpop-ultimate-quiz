import type { Group, Idol, IdolGender } from '@/shared/models'

export const ASSET_BASE_PATH = '/assets' as const

const PLACEHOLDER_PATHS = {
  groupCover: `${ASSET_BASE_PATH}/placeholders/group-cover.webp`,
  idolFemale: `${ASSET_BASE_PATH}/placeholders/idol-female.webp`,
  idolMale: `${ASSET_BASE_PATH}/placeholders/idol-male.webp`,
} as const

function stripFragileRelative(path: string): string {
  return path.replace(/^(\.\.\/)+/g, '')
}

function normalizeAssetPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed

  const safe = stripFragileRelative(trimmed)
  if (safe.startsWith('/')) return safe
  return `/${safe}`
}

export function getGroupCoverPath(groupId: string): string {
  return `${ASSET_BASE_PATH}/groups/${groupId}/cover.webp`
}

export function getIdolPortraitPath(idolId: string): string {
  return `${ASSET_BASE_PATH}/idols/${idolId}/portrait.webp`
}

export function getGroupPlaceholderPath(): string {
  return PLACEHOLDER_PATHS.groupCover
}

export function getIdolPlaceholderPath(gender: IdolGender): string {
  return gender === 'm' ? PLACEHOLDER_PATHS.idolMale : PLACEHOLDER_PATHS.idolFemale
}

export function resolveGroupCover(group: Pick<Group, 'id' | 'coverImage'>): string {
  if (!group.coverImage) return getGroupPlaceholderPath()
  return normalizeAssetPath(group.coverImage) || getGroupPlaceholderPath()
}

export function resolveIdolPortrait(idol: Pick<Idol, 'id' | 'portrait' | 'gender'>): string {
  if (!idol.portrait) return getIdolPlaceholderPath(idol.gender)
  return normalizeAssetPath(idol.portrait) || getIdolPlaceholderPath(idol.gender)
}

export const ASSET_PLACEHOLDERS = PLACEHOLDER_PATHS
