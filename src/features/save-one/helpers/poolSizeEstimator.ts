/**
 * poolSizeEstimator.ts
 *
 * Estimations légères de la taille du pool (sans charger idols.json).
 * Partagé entre ConfigPage et poolScopeRules.
 */
import type { Group, MemberRole, SaveOneCriterion, SongType, LanguageOption } from '@/shared/models'

export function resolveEffectiveRoles(
  criterion:   SaveOneCriterion,
  roleFilters: MemberRole[],
): MemberRole[] {
  if (criterion === 'leadership') return ['leader']
  return roleFilters
}

export function estimateIdolPoolSize(
  groups:      Group[],
  criterion:   SaveOneCriterion,
  roleFilters: MemberRole[],
): number {
  const effectiveRoles = resolveEffectiveRoles(criterion, roleFilters)
  const seen = new Set<string>()
  for (const group of groups) {
    for (const member of group.members) {
      if (effectiveRoles.length > 0 && !member.roles.some((r) => effectiveRoles.includes(r))) continue
      seen.add(member.idolId)
    }
  }
  return seen.size
}

/**
 * Vérifie si une chanson correspond au filtre de langue.
 *
 * Règle : le coréen est implicite — une chanson sans champ `language` est coréenne.
 *   - 'all' → inclure toutes les chansons
 *   - 'kr'  → chansons sans language OU language === 'kr'
 *   - 'jp'  → chansons avec language === 'jp'
 *   - 'en'  → chansons avec language === 'en'
 */
export function songMatchesLanguage(
  songLanguage:   string | undefined,
  filterLanguage: LanguageOption,
): boolean {
  if (filterLanguage === 'all') return true
  if (filterLanguage === 'kr')  return !songLanguage || songLanguage === 'kr'
  return songLanguage === filterLanguage
}

export function estimateSongPoolSize(
  groups:       Group[],
  songType:     SongType,
  songLanguage: LanguageOption = 'all',
): number {
  let count = 0
  for (const group of groups) {
    const { titles, bSides } = group.discography

    let songs: typeof titles = []
    if      (songType === 'titles')     songs = titles
    else if (songType === 'bSides')     songs = bSides
    else if (songType === 'debutSongs') songs = titles.filter((s) => s.isDebutSong)
    else                                songs = [...titles, ...bSides]

    for (const song of songs) {
      if (songMatchesLanguage(song.language, songLanguage)) count++
    }
  }
  return count
}

export interface PoolCheckResult {
  poolSize:           number
  choicesPerRound:    number
  ok:                 boolean
  minDrops:           number
  minRounds:          number
  maxRoundsNoRecycle: number
}

export function checkPoolFeasibility(poolSize: number, drops: number, rounds: number): PoolCheckResult {
  const choicesPerRound    = drops + 1
  const maxRoundsNoRecycle = Math.floor(poolSize / choicesPerRound)
  return {
    poolSize,
    choicesPerRound,
    ok:                 poolSize >= choicesPerRound,
    minDrops:           Math.max(0, Math.min(drops, poolSize - 1)),
    minRounds:          Math.min(rounds, Math.max(1, maxRoundsNoRecycle)),
    maxRoundsNoRecycle,
  }
}
