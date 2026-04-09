export const PLACEHOLDER_PATHS = {
  groupCover: '/assets/placeholders/group-cover.webp',
  idolFemale: '/assets/placeholders/idol-female.webp',
  idolMale: '/assets/placeholders/idol-male.webp',
} as const

function ensureAbsoluteAssetPath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path
  return `/${path}`
}

export function resolveGroupCover(group: { coverImage?: string | null }): string {
  if (!group.coverImage) return PLACEHOLDER_PATHS.groupCover
  return ensureAbsoluteAssetPath(group.coverImage)
}

export function resolveIdolPortrait(idol: { portrait?: string | null; gender: 'f' | 'm' }): string {
  if (idol.portrait) return ensureAbsoluteAssetPath(idol.portrait)
  return idol.gender === 'm' ? PLACEHOLDER_PATHS.idolMale : PLACEHOLDER_PATHS.idolFemale
}
