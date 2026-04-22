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
type QuizMode = 'saveOne' | 'blindTest'

// ─── Items par round ──────────────────────────────────────────────────────────

export function computeItemsPerRound(
  mode: QuizMode,
  dropCount: number,
  twoPlayers: boolean,
): number {
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

  // Groupes sans items → pas valides
  const validCounts = groupCounts.filter((c) => c > 0)
  if (validCounts.length === 0) return 0

  const total      = validCounts.reduce((s, c) => s + c, 0)
  const maxGeneral = Math.floor(total / K)
  if (maxGeneral === 0) return 0

  let maxBalanced: number

  if (K <= N) {
    // Chaque groupe tourne à une fréquence de K/N rounds
    // → round max pour le groupe i = floor(count[i] × N / K)
    maxBalanced = Math.min(...validCounts.map((c) => Math.floor((c * N) / K)))
  } else {
    // Pire cas : les groupes avec le moins d'items reçoivent les slots supplémentaires
    const sorted    = [...validCounts].sort((a, b) => a - b)  // ASC : plus petit = plus de slots
    const base      = Math.floor(K / N)
    const extra     = K % N  // les `extra` premiers groupes (triés ASC) reçoivent 1 slot de plus
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
  mode:        QuizMode
  category:    'idols' | 'songs'
  groups:      Group[]
  drops:       number
  rounds:      number
  twoPlayers:  boolean
  criterion:   SaveOneCriterion
  roleFilters: MemberRole[]
  songType:    SongType
}

export function computeMaxRounds(input: MaxRoundsInput): MaxRoundsResult {
  const { mode, category, groups, drops, rounds, twoPlayers, criterion, roleFilters, songType } = input

  const K = computeItemsPerRound(mode, drops, twoPlayers)

  // Scope total
  const scopeSize = category === 'idols'
    ? estimateIdolPoolSize(groups, criterion, roleFilters)
    : estimateSongPoolSize(groups, songType)

  // Counts par groupe (groupes avec au moins 1 item dans le scope)
  const effectiveRoles = resolveEffectiveRoles(criterion, roleFilters)
  const groupCounts = groups
    .map((g) => category === 'idols'
      ? countIdolsInGroup(g, effectiveRoles)
      : countSongsInGroup(g, songType))
    .filter((c) => c > 0)

  // maxRounds calculé par analyse Fair Queue
  const maxRounds = groupCounts.length > 0
    ? computeMaxRoundsForGroups(groupCounts, K)
    : (scopeSize > 0 ? Math.floor(scopeSize / K) : 0)

  const effectiveMax = Math.max(0, maxRounds)
  const wasClamped   = rounds > effectiveMax

  const clampMessage = wasClamped
    ? buildClampMessage(scopeSize, effectiveMax, groups, mode, twoPlayers)
    : undefined

  return { maxRounds: effectiveMax, scopeSize, itemsPerRound: K, wasClamped, clampMessage }
}

function buildClampMessage(
  scopeSize:  number,
  maxRounds:  number,
  groups:     Group[],
  mode:       QuizMode,
  twoPlayers: boolean,
): string {
  const maxStr = `${maxRounds} round${maxRounds > 1 ? 's' : ''}`

  if (mode === 'blindTest' && twoPlayers) {
    return `Blind Test 2 joueurs — 2 musiques distinctes par round nécessaires, maximum ${maxStr}.`
  }
  if (groups.length === 2) {
    return `${groups[0].name} vs ${groups[1].name} — maximum ${maxStr} pour garantir un duel équilibré sans répétition.`
  }
  return `${scopeSize} item${scopeSize > 1 ? 's' : ''} disponible${scopeSize > 1 ? 's' : ''} — maximum ${maxStr} pour garantir des rounds complets sans répétition.`
}

export function clampRounds(rounds: number, maxRounds: number): number {
  return Math.min(Math.max(1, rounds), Math.max(1, maxRounds))
}
