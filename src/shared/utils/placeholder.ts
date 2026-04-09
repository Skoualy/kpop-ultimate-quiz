export const PLACEHOLDER_PATHS = {
  groupCover: '/assets/placeholders/group-cover.webp',
  idolFemale: '/assets/placeholders/idol-female.webp',
  idolMale: '/assets/placeholders/idol-male.webp',
} as const

export function resolveGroupCover(group: { coverImage?: string | null }): string {
  return group.coverImage || PLACEHOLDER_PATHS.groupCover
}

export function resolveIdolPortrait(idol: { portrait?: string | null; gender: 'f' | 'm' }): string {
  if (idol.portrait) return idol.portrait
  return idol.gender === 'm' ? PLACEHOLDER_PATHS.idolMale : PLACEHOLDER_PATHS.idolFemale
}
