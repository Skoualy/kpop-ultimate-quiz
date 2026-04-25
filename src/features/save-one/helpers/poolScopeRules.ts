/**
 * poolScopeRules.ts — calcul du nombre max de rounds jouables.
 */

import type { Group, MemberRole, SaveOneCriterion } from '@/shared/models'
import { resolveEffectiveRoles, estimateIdolPoolSize, estimateSongPoolSize, songMatchesLanguage } from './poolSizeEstimator'

type SongType     = 'all' | 'titles' | 'bSides' | 'debutSongs'
type LanguageOption = 'all' | 'kr' | 'jp' | 'en'
type QuizMode     = 'saveOne' | 'blindTest' | 'quickVote'

// ─── Items par round ──────────────────────────────────────────────────────────

export function computeItemsPerRound(mode: QuizMode, dropCount: number, twoPlayers: boolean): number {
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

function countSongsInGroup(
  group:        Group,
  songType:     SongType,
  songLanguage: LanguageOption,
): number {
  const { titles, bSides } = group.discography

  let songs: typeof titles = []
  if (songType === 'titles')          songs = titles
  else if (songType === 'bSides')     songs = bSides
  else if (songType === 'debutSongs') songs = titles.filter((s) => s.isDebutSong)
  else                                songs = [...titles, ...bSides]

  return songs.filter((s) => songMatchesLanguage(s.language, songLanguage)).length
}

// ─── Fair Group Queue ─────────────────────────────────────────────────────────

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
  /** Filtre langue chansons (défaut : 'all') */
  songLanguage?: LanguageOption
}

export function computeMaxRounds(input: MaxRoundsInput): MaxRoundsResult {
  const {
    mode, category, groups, drops, rounds, twoPlayers,
    criterion, roleFilters, songType,
    songLanguage = 'all',
  } = input

  const K = computeItemsPerRound(mode, drops, twoPlayers)

  const scopeSize = category === 'idols'
    ? estimateIdolPoolSize(groups, criterion, roleFilters)
    : estimateSongPoolSize(groups, songType, songLanguage)

  const effectiveRoles = resolveEffectiveRoles(criterion, roleFilters)
  const groupCounts    = groups
    .map((g) => category === 'idols'
      ? countIdolsInGroup(g, effectiveRoles)
      : countSongsInGroup(g, songType, songLanguage))
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
