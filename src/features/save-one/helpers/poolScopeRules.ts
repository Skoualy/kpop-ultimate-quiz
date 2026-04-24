/**
 * poolScopeRules.ts
 *
 * Calcul du nombre maximum de rounds jouables sans aucun round dégradé.
 *
 * Règle fondamentale :
 *   maxRounds est calculé pour que buildRounds puisse générer EXACTEMENT
 *   ce nombre de rounds complets — ni plus, ni moins.
 *
 * Algorithme "Fair Group Queue" — analyse par groupe :
 *
 *   Pour N groupes et K items/round (choicesPerRound) :
 *
 *   Si K ≤ N :
 *     Chaque groupe apparaît K/N fois par round en moyenne.
 *     maxRoundsForGroup[i] = floor(count[i] × N / K)
 *
 *   Si K > N :
 *     Certains groupes ont plus de slots/round que d'autres.
 *     On simule le pire cas : on attribue les slots extra aux groupes
 *     avec le moins d'items (bottleneck le plus rapide).
 *     sorted = counts ASC
 *     slotsForGroup[i] = floor(K/N) + (1 si i < K%N sinon 0)
 *     maxRoundsForGroup[i] = floor(sorted[i] / slotsForGroup[i])
 *
 *   maxRounds = min(general, balanced)
 */

import type { Group, MemberRole, SaveOneCriterion } from '@/shared/models'
import { resolveEffectiveRoles, estimateIdolPoolSize, estimateSongPoolSize } from './poolSizeEstimator'

type SongType = 'all' | 'titles' | 'bSides' | 'debutSongs'

/**
 * Mode pris en compte par les règles de scope.
 * quickVote = saveOne avec dropCount = 0 (toujours 1 item/round).
 */
type QuizMode = 'saveOne' | 'blindTest' | 'quickVote'

// ─── Items par round ──────────────────────────────────────────────────────────

/**
 * Nombre d'items attendus par round selon le mode.
 * - quickVote : toujours 1, dropCount ignoré
 * - blindTest : 1 solo, 2 en mode 2 joueurs
 * - saveOne   : dropCount + 1
 */
export function computeItemsPerRound(
  mode:       QuizMode,
  dropCount:  number,
  twoPlayers: boolean,
): number {
  if (mode === 'quickVote') return 1
  if (mode === 'blindTest') return twoPlayers ? 2 : 1
  return dropCount + 1
}

// ─── Counts par groupe ────────────────────────────────────────────────────────

function countIdolsInGroup(group: Group, effectiveRoles: MemberRole[]): number {
  const seen = new Set<string>()
  for (const member of group.members) {
    if (effectiveRoles.length > 0 && !member.roles.some((r) => effectiveRoles.includes(r))) continue
    seen.add(member.idolId)
  }
  return seen.size
}

function countSongsInGroup(group: Group, songType: SongType): number {
  const { titles, bSides } = group.discography
  if (songType === 'titles')      return titles.length
  if (songType === 'bSides')      return bSides.length
  if (songType === 'debutSongs')  return titles.filter((s) => s.isDebutSong).length
  return titles.length + bSides.length
}

// ─── Calcul maxRounds par groupe ─────────────────────────────────────────────

/**
 * Calcule le nombre max de rounds que le Fair Group Queue peut générer
 * sans jamais produire de round incomplet ou déséquilibré.
 *
 * @param groupCounts  Nombre d'items par groupe, dans l'ordre d'allocation
 * @param K            choicesPerRound
 */
export function computeMaxRoundsForGroups(groupCounts: number[], K: number): number {
  const N = groupCounts.length
  if (N === 0 || K === 0) return 0

  const validCounts = groupCounts.filter((c) => c > 0)
  if (validCounts.length === 0) return 0

  const total      = validCounts.reduce((s, c) => s + c, 0)
  const maxGeneral = Math.floor(total / K)
  if (maxGeneral === 0) return 0

  let maxBalanced: number

  if (K <= N) {
    maxBalanced = Math.min(...validCounts.map((c) => Math.floor((c * N) / K)))
  } else {
    const sorted = [...validCounts].sort((a, b) => a - b)
    const base   = Math.floor(K / N)
    const extra  = K % N
    let min = Infinity
    for (let i = 0; i < sorted.length; i++) {
      const slots = base + (i < extra ? 1 : 0)
      if (slots > 0) min = Math.min(min, Math.floor(sorted[i] / slots))
    }
    maxBalanced = min === Infinity ? 0 : min
  }

  return Math.min(maxGeneral, maxBalanced)
}

// ─── Interface publique ───────────────────────────────────────────────────────

export interface MaxRoundsResult {
  maxRounds:     number
  scopeSize:     number
  itemsPerRound: number
  /** true si la valeur rounds de la config a été réduite */
  wasClamped:    boolean
  clampMessage?: string
}

export interface MaxRoundsInput {
  mode:         QuizMode
  category:     'idols' | 'songs'
  groups:       Group[]
  drops:        number
  rounds:       number
  twoPlayers:   boolean
  criterion:    SaveOneCriterion
  roleFilters:  MemberRole[]
  songType:     SongType
  /** Optionnel — réservé pour le filtre langue futur */
  songLanguage?: string
}

export function computeMaxRounds(input: MaxRoundsInput): MaxRoundsResult {
  const { mode, category, groups, drops, rounds, twoPlayers, criterion, roleFilters, songType } = input

  const K = computeItemsPerRound(mode, drops, twoPlayers)

  const scopeSize = category === 'idols'
    ? estimateIdolPoolSize(groups, criterion, roleFilters)
    : estimateSongPoolSize(groups, songType)

  const effectiveRoles = resolveEffectiveRoles(criterion, roleFilters)
  const groupCounts    = groups
    .map((g) => category === 'idols'
      ? countIdolsInGroup(g, effectiveRoles)
      : countSongsInGroup(g, songType))
    .filter((c) => c > 0)

  const maxRounds = groupCounts.length > 0
    ? computeMaxRoundsForGroups(groupCounts, K)
    : (scopeSize > 0 ? Math.floor(scopeSize / K) : 0)

  const wasClamped   = maxRounds < rounds
  const clampMessage = wasClamped
    ? `Nombre de rounds réduit à ${maxRounds} (scope disponible insuffisant pour ${rounds} rounds).`
    : undefined

  return { maxRounds, scopeSize, itemsPerRound: K, wasClamped, clampMessage }
}
