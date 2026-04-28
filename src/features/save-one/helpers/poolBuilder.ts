/**
 * poolBuilder.ts
 *
 * Construction de rounds avec garantie d'intégrité absolue.
 *
 * FIX : lastRoundUsed n'est mis à jour que pour les groupes ayant réellement
 * contribué des items (slots > 0). Auparavant, tous les groupes éligibles
 * recevaient la même valeur → leur lastRoundUsed s'uniformisait → le tirage
 * suivant devenait aléatoire → même artiste pouvait apparaître consécutivement.
 */

import type { Group, Idol, MemberRole, SaveOneCriterion } from '@/shared/models'
import type { IdolItem, RoundData, SongItem } from '../SaveOnePage.types'
import { pickCanonicalTimestamp } from './timestampHelper'
import { extractYouTubeId, getYouTubeThumbnail } from './youtubeHelpers'
import { resolveEffectiveRoles, songMatchesLanguage } from './poolSizeEstimator'
import {
  type SongSessionMemory,
  type SongModeKey,
  computeSongWeight,
  weightedPickUnique,
  getLastCanonicalTimestamp,
} from './songSessionMemory'

// ─── Shuffle ─────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Critères aléatoires ──────────────────────────────────────────────────────

const RANDOM_CRITERIA: SaveOneCriterion[] = ['beauty', 'personality', 'voice', 'performance']

export function pickRandomCriterion(): SaveOneCriterion {
  return RANDOM_CRITERIA[Math.floor(Math.random() * RANDOM_CRITERIA.length)]
}

// ─── Idol pool ────────────────────────────────────────────────────────────────

interface IdolPoolFilters {
  roleFilters: MemberRole[]
  criterion:   SaveOneCriterion
}

export function buildIdolPool(groups: Group[], allIdols: Idol[], filters: IdolPoolFilters): IdolItem[] {
  const idolMap = new Map<string, Idol>(allIdols.map((i) => [i.id, i]))
  const seen    = new Set<string>()
  const pool: IdolItem[] = []

  const effectiveRoles = resolveEffectiveRoles(filters.criterion, filters.roleFilters)

  for (const group of groups) {
    for (const member of group.members) {
      const idol = idolMap.get(member.idolId)
      if (!idol || seen.has(idol.id)) continue
      if (effectiveRoles.length > 0 && !member.roles.some((r) => effectiveRoles.includes(r))) continue

      seen.add(idol.id)
      pool.push({
        type:      'idol',
        idolId:    idol.id,
        name:      idol.name,
        groupId:   group.id,
        groupName: group.name,
        portrait:  idol.portrait ?? null,
        isFormer:  member.status === 'former',
        roles:     member.roles,
      })
    }
  }

  return pool
}

// ─── Song pool ────────────────────────────────────────────────────────────────

type SongType      = 'all' | 'titles' | 'bSides' | 'debutSongs'
type LanguageOption = 'all' | 'kr' | 'jp' | 'en'

interface SongPoolFilters {
  songType:     SongType
  clipDuration: number
  /** Filtre langue (défaut : 'all') */
  songLanguage?: LanguageOption
}

export function buildSongPool(groups: Group[], filters: SongPoolFilters): SongItem[] {
  const pool: SongItem[] = []
  const lang = filters.songLanguage ?? 'all'

  for (const group of groups) {
    const { discography } = group
    let songs = [...discography.titles, ...discography.bSides]

    if (filters.songType === 'titles')       songs = discography.titles
    else if (filters.songType === 'bSides')  songs = discography.bSides
    else if (filters.songType === 'debutSongs') songs = discography.titles.filter((s) => s.isDebutSong)

    for (const song of songs) {
      if (!songMatchesLanguage(song.language, lang)) continue

      const youtubeId = extractYouTubeId(song.youtubeUrl)
      if (!youtubeId) continue

      const startTime = pickCanonicalTimestamp()
      const endTime   = startTime + filters.clipDuration

      pool.push({
        type:         'song',
        songId:       song.id,
        title:        song.title,
        groupId:      group.id,
        groupName:    group.name,
        youtubeId,
        thumbnailUrl: getYouTubeThumbnail(youtubeId),
        startTime,
        endTime,
      })
    }
  }

  return pool
}

// ─── Fair Group Queue ─────────────────────────────────────────────────────────

function allocateGroupSlots(
  groupStats: Array<{ groupId: string; lastRoundUsed: number }>,
  K: number,
): Map<string, number> {
  if (groupStats.length === 0) return new Map()

  const sorted = [...groupStats].sort((a, b) => {
    if (a.lastRoundUsed !== b.lastRoundUsed) return a.lastRoundUsed - b.lastRoundUsed
    return Math.random() - 0.5
  })

  const slots = new Map<string, number>()
  for (const g of sorted) slots.set(g.groupId, 0)

  for (let i = 0; i < K; i++) {
    const group = sorted[i % sorted.length]
    slots.set(group.groupId, (slots.get(group.groupId) ?? 0) + 1)
  }

  return slots
}

// ─── Round builder ────────────────────────────────────────────────────────────

interface RoundConfig {
  totalRounds:  number
  dropCount:    number
  criterion:    SaveOneCriterion
  clipDuration: number
}

export function buildRounds(
  pool:        IdolItem[] | SongItem[],
  config:      RoundConfig,
  songMemory?: SongSessionMemory,
  songModeKey?: SongModeKey,
): RoundData[] {
  const K          = config.dropCount + 1
  const isIdolPool = pool.length > 0 && (pool[0] as IdolItem).type === 'idol'
  const rounds: RoundData[] = []

  type PoolItem = IdolItem | SongItem
  const byGroup = new Map<string, PoolItem[]>()
  for (const item of pool) {
    const gid = item.groupId
    if (!byGroup.has(gid)) byGroup.set(gid, [])
    byGroup.get(gid)!.push(item)
  }

  const groupStats    = [...byGroup.keys()].map((gid) => ({ groupId: gid, lastRoundUsed: -1 }))
  const usedByGroup   = new Map<string, Set<string>>()
  for (const gid of byGroup.keys()) usedByGroup.set(gid, new Set())

  for (let roundIndex = 0; roundIndex < config.totalRounds; roundIndex++) {
    const eligibleStats = groupStats.filter((gs) => {
      const used      = usedByGroup.get(gs.groupId)!.size
      const available = (byGroup.get(gs.groupId)?.length ?? 0) - used
      return available > 0
    })

    if (eligibleStats.length === 0) break

    const slots = allocateGroupSlots(eligibleStats, K)

    let roundFeasible = true
    for (const [gid, count] of slots.entries()) {
      const used      = usedByGroup.get(gid)!.size
      const available = (byGroup.get(gid)?.length ?? 0) - used
      if (available < count) { roundFeasible = false; break }
    }
    if (!roundFeasible) break

    const roundItems: PoolItem[] = []

    for (const [gid, count] of slots.entries()) {
      if (count === 0) continue // pas de contribution pour ce groupe ce round

      const groupItems = byGroup.get(gid)!
      const used       = usedByGroup.get(gid)!

      if (isIdolPool) {
        const available = (groupItems as IdolItem[]).filter((item) => !used.has(item.idolId))
        const picked    = shuffle(available).slice(0, count)
        for (const item of picked) {
          used.add(item.idolId)
          roundItems.push(item)
        }
      } else {
        const available = (groupItems as SongItem[]).filter((item) => !used.has(item.songId))
        const memory    = songMemory ?? { nbRounds: 0, entries: {} }
        const picked    = weightedPickUnique(available, count, (item) => computeSongWeight(item.songId, memory))
        for (const item of picked) {
          const lastTs  = getLastCanonicalTimestamp(item.songId, memory)
          const newTs   = pickCanonicalTimestamp(lastTs)
          const updated = { ...item, startTime: newTs, endTime: newTs + config.clipDuration }
          used.add(item.songId)
          roundItems.push(updated)
        }
      }
    }

    if (roundItems.length < K) break

    const shuffledItems    = shuffle(roundItems)
    const activeCriterion  = config.criterion === 'random' ? pickRandomCriterion() : config.criterion

    rounds.push({
      roundNumber:     roundIndex + 1,
      items:           shuffledItems,
      activeCriterion: activeCriterion as SaveOneCriterion,
    })

    /**
     * FIX : mise à jour de lastRoundUsed uniquement pour les groupes
     * ayant réellement contribué des items (slots > 0).
     * Avant ce fix, tous les groupes éligibles recevaient la même valeur,
     * ce qui faisait converger leurs lastRoundUsed et rendait le tirage suivant
     * entièrement aléatoire → possibilité du même artiste deux rounds de suite.
     */
    for (const gs of groupStats) {
      if ((slots.get(gs.groupId) ?? 0) > 0) {
        gs.lastRoundUsed = roundIndex
      }
    }
  }

  return rounds
}
