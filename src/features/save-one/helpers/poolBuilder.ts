import type { Group, Idol, MemberRole, SaveOneCriterion } from '@/shared/models'
import type { IdolItem, RoundData, SongItem } from '../SaveOnePage.types'
import { computeStartTime, DEFAULT_DURATION_SECONDS } from './timestampHelper'
import { extractYouTubeId, getYouTubeThumbnail } from './youtubeHelpers'
import { resolveEffectiveRoles } from './poolSizeEstimator'

// ─── Shuffle ─────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Critères aléatoires ─────────────────────────────────────────────────────

/** Critères sélectionnables aléatoirement (hors 'random', 'all', 'leadership') */
const RANDOM_CRITERIA: SaveOneCriterion[] = ['beauty', 'personality', 'voice', 'performance']

export function pickRandomCriterion(): SaveOneCriterion {
  return RANDOM_CRITERIA[Math.floor(Math.random() * RANDOM_CRITERIA.length)]
}

// ─── Idol pool ────────────────────────────────────────────────────────────────

interface IdolPoolFilters {
  roleFilters: MemberRole[]
  criterion: SaveOneCriterion
}

export function buildIdolPool(
  groups: Group[],
  allIdols: Idol[],
  filters: IdolPoolFilters,
): IdolItem[] {
  const idolMap = new Map<string, Idol>(allIdols.map((i) => [i.id, i]))
  const seen = new Set<string>()
  const pool: IdolItem[] = []

  // Leadership force 'leader', sinon roleFilters normal
  const effectiveRoles = resolveEffectiveRoles(filters.criterion, filters.roleFilters)

  for (const group of groups) {
    for (const member of group.members) {
      const idol = idolMap.get(member.idolId)
      if (!idol) continue
      if (seen.has(idol.id)) continue

      if (effectiveRoles.length > 0) {
        if (!member.roles.some((r) => effectiveRoles.includes(r))) continue
      }

      seen.add(idol.id)
      pool.push({
        type: 'idol',
        idolId: idol.id,
        name: idol.name,
        groupId: group.id,
        groupName: group.name,
        portrait: idol.portrait ?? null,
        isFormer: member.status === 'former',
        roles: member.roles,
      })
    }
  }

  return shuffle(pool)
}

// ─── Song pool ───────────────────────────────────────────────────────────────

type SongType = 'all' | 'titles' | 'bSides' | 'debutSongs'

interface SongPoolFilters {
  songType: SongType
  clipDuration: number
}

export function buildSongPool(groups: Group[], filters: SongPoolFilters): SongItem[] {
  const pool: SongItem[] = []

  for (const group of groups) {
    const { discography } = group
    let songs = [...discography.titles, ...discography.bSides]

    if (filters.songType === 'titles')      songs = discography.titles
    else if (filters.songType === 'bSides') songs = discography.bSides
    else if (filters.songType === 'debutSongs') songs = discography.titles.filter((s) => s.isDebutSong)

    for (const song of songs) {
      const youtubeId = extractYouTubeId(song.youtubeUrl)
      if (!youtubeId) continue

      const duration  = DEFAULT_DURATION_SECONDS
      const startTime = computeStartTime(duration, filters.clipDuration)
      const endTime   = startTime + filters.clipDuration

      pool.push({
        type: 'song',
        songId: song.id,
        title: song.title,
        groupId: group.id,
        groupName: group.name,
        youtubeId,
        thumbnailUrl: getYouTubeThumbnail(youtubeId),
        startTime,
        endTime,
      })
    }
  }

  return shuffle(pool)
}

// ─── Round builder ────────────────────────────────────────────────────────────

interface RoundConfig {
  totalRounds: number
  dropCount: number
  criterion: SaveOneCriterion  // pour assigner activeCriterion par round
}

export function buildRounds(
  rawPool: IdolItem[] | SongItem[],
  config: RoundConfig,
): RoundData[] {
  const choicesPerRound = config.dropCount + 1
  if (rawPool.length === 0) return []

  let pool: (IdolItem | SongItem)[] = [...rawPool]
  const rounds: RoundData[] = []

  for (let r = 0; r < config.totalRounds; r++) {
    // Recyclage si pool insuffisant
    if (pool.length < choicesPerRound) {
      pool = [...pool, ...shuffle([...rawPool])]
    }

    const round = pickDiverseRound(pool, choicesPerRound)
    const pickedIds = new Set(round.map(getItemId))
    pool = pool.filter((item) => !pickedIds.has(getItemId(item)))

    // Résoudre le critère actif (si 'random' → pick aléatoire à chaque round)
    const activeCriterion: SaveOneCriterion =
      config.criterion === 'random' ? pickRandomCriterion() : config.criterion

    rounds.push({
      roundNumber: r + 1,
      items: round as IdolItem[] | SongItem[],
      activeCriterion,
    })
  }

  return rounds
}

function pickDiverseRound(pool: (IdolItem | SongItem)[], count: number): (IdolItem | SongItem)[] {
  const selected: (IdolItem | SongItem)[] = []
  const usedGroups = new Set<string>()
  const remaining  = [...pool]

  for (let i = 0; i < count; i++) {
    const idx = remaining.findIndex((item) => !usedGroups.has(item.groupId))
    if (idx !== -1) {
      const [item] = remaining.splice(idx, 1)
      selected.push(item)
      usedGroups.add(item.groupId)
    } else if (remaining.length > 0) {
      const [item] = remaining.splice(0, 1)
      selected.push(item)
    }
  }

  return selected
}

function getItemId(item: IdolItem | SongItem): string {
  return item.type === 'idol' ? item.idolId : item.songId
}
