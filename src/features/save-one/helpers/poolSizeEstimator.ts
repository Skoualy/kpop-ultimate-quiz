/**
 * Estimations rapides de la taille du pool pour la validation sur la ConfigPage.
 * Ne charge pas idols.json — utilise uniquement les groupes déjà chargés.
 */
import type { Group, MemberRole, SaveOneCriterion } from '@/shared/models'

type SongType = 'all' | 'titles' | 'bSides' | 'debutSongs'

/**
 * Résout les roleFilters effectifs selon le critère.
 * - leadership → force ['leader'] même si roleFilters est vide
 * - autres → utilise roleFilters tel quel
 */
export function resolveEffectiveRoles(
  criterion: SaveOneCriterion,
  roleFilters: MemberRole[],
): MemberRole[] {
  if (criterion === 'leadership') return ['leader']
  return roleFilters
}

/**
 * Estime le nombre d'idoles uniques dans le pool.
 * Utilise les memberships des groupes (sans charger idols.json).
 */
export function estimateIdolPoolSize(
  groups: Group[],
  criterion: SaveOneCriterion,
  roleFilters: MemberRole[],
): number {
  const effectiveRoles = resolveEffectiveRoles(criterion, roleFilters)
  const seen = new Set<string>()

  for (const group of groups) {
    for (const member of group.members) {
      if (effectiveRoles.length > 0) {
        if (!member.roles.some((r) => effectiveRoles.includes(r))) continue
      }
      seen.add(member.idolId)
    }
  }

  return seen.size
}

/**
 * Estime le nombre de chansons uniques dans le pool.
 */
export function estimateSongPoolSize(groups: Group[], songType: SongType): number {
  let count = 0
  for (const group of groups) {
    const { titles, bSides } = group.discography
    if (songType === 'titles')      count += titles.length
    else if (songType === 'bSides') count += bSides.length
    else if (songType === 'debutSongs') count += titles.filter((s) => s.isDebutSong).length
    else count += titles.length + bSides.length
  }
  return count
}

/**
 * Vérifie si la config est jouable et calcule une config minimale viable.
 */
export interface PoolCheckResult {
  poolSize: number
  choicesPerRound: number
  /** true = partie jouable telle quelle */
  ok: boolean
  /** Config minimale viable (drops=0 = 1 choix vs 1, rounds=1) */
  minDrops: number
  minRounds: number
  /** Nombre max de rounds jouables sans recyclage */
  maxRoundsNoRecycle: number
}

export function checkPoolFeasibility(
  poolSize: number,
  drops: number,
  rounds: number,
): PoolCheckResult {
  const choicesPerRound = drops + 1
  const maxRoundsNoRecycle = Math.floor(poolSize / choicesPerRound)

  // La partie est jouable si on a au moins choicesPerRound items (recyclage autorisé)
  const ok = poolSize >= choicesPerRound

  // Config minimale viable : le plus grand drop possible avec ce pool, 1 round
  const minDrops = Math.max(0, Math.min(drops, poolSize - 1))
  const minRounds = Math.min(rounds, Math.max(1, maxRoundsNoRecycle))

  return { poolSize, choicesPerRound, ok, minDrops, minRounds, maxRoundsNoRecycle }
}
