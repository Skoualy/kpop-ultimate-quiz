import type { Group, Idol, SongType } from '@/shared/models'
import { extractYoutubeId, getThumbnailUrl } from '@/shared/utils/youtube'
import { getSafePreviewStartTimestamp } from './songPreviewStart'
import type { IdolPoolEntry, SaveOneRound, SaveOneRoundChoice, SongPoolEntry } from './saveOne.types'

interface BuildIdolPoolParams {
  groups: Group[]
  idols: Idol[]
  roleFilters: string[]
}

interface BuildSongPoolParams {
  groups: Group[]
  songType: SongType
  clipDuration: number
}

interface GenerateRoundsParams<T extends SaveOneRoundChoice> {
  basePool: T[]
  rounds: number
  choicesPerRound: number
}

function randomSort<T>(list: T[]): T[] {
  return [...list].sort(() => Math.random() - 0.5)
}

export function buildIdolPool({ groups, idols, roleFilters }: BuildIdolPoolParams): IdolPoolEntry[] {
  const idolMap = new Map(idols.map((idol) => [idol.id, idol]))
  const groupMap = new Map(groups.map((group) => [group.id, group]))
  const unique = new Map<string, IdolPoolEntry>()

  groups.forEach((group) => {
    group.members.forEach((member) => {
      if (roleFilters.length > 0 && !member.roles.some((role) => roleFilters.includes(role))) {
        return
      }

      if (unique.has(member.idolId)) {
        const existing = unique.get(member.idolId)
        if (existing && member.status === 'former') {
          existing.isFormerMember = true
        }
        return
      }

      const idol = idolMap.get(member.idolId)
      if (!idol) return

      const primaryGroup = groupMap.get(idol.primaryGroupId) ?? group
      unique.set(member.idolId, {
        id: `idol:${idol.id}`,
        groupId: primaryGroup.id,
        groupName: primaryGroup.name,
        idol,
        isFormerMember: member.status === 'former',
      })
    })
  })

  return randomSort(Array.from(unique.values()))
}

export function buildSongPool({ groups, songType, clipDuration }: BuildSongPoolParams): SongPoolEntry[] {
  const unique = new Map<string, SongPoolEntry>()

  groups.forEach((group) => {
    const titles = group.discography.titles ?? []
    const bSides = group.discography.bSides ?? []

    const songs = songType === 'titles'
      ? titles
      : songType === 'bSides'
        ? bSides
        : songType === 'debutSongs'
          ? [...titles, ...bSides].filter((song) => Boolean(song.isDebutSong))
          : [...titles, ...bSides]

    songs.forEach((song) => {
      if (unique.has(song.id)) return

      const youtubeId = extractYoutubeId(song.youtubeUrl)
      unique.set(song.id, {
        id: `song:${song.id}`,
        groupId: group.id,
        groupName: group.name,
        song,
        youtubeId,
        thumbnailUrl: getThumbnailUrl(song.youtubeUrl),
        previewStartSeconds: getSafePreviewStartTimestamp({ clipDuration }),
      })
    })
  })

  return randomSort(Array.from(unique.values()))
}

function drawRoundChoices<T extends SaveOneRoundChoice>(
  pool: T[],
  choicesPerRound: number,
  usageByGroup: Map<string, number>,
): T[] {
  const result: T[] = []
  const usedGroupIds = new Set<string>()

  const byGroup = new Map<string, T[]>()
  pool.forEach((entry) => {
    const list = byGroup.get(entry.groupId) ?? []
    list.push(entry)
    byGroup.set(entry.groupId, list)
  })

  const groupOrder = Array.from(byGroup.keys()).sort((a, b) => {
    const aCount = usageByGroup.get(a) ?? 0
    const bCount = usageByGroup.get(b) ?? 0
    if (aCount === bCount) return Math.random() - 0.5
    return aCount - bCount
  })

  groupOrder.forEach((groupId) => {
    if (result.length >= choicesPerRound) return
    const candidates = byGroup.get(groupId)
    if (!candidates || candidates.length === 0 || usedGroupIds.has(groupId)) return
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    result.push(pick)
    usedGroupIds.add(groupId)
  })

  if (result.length < choicesPerRound) {
    const leftovers = pool
      .filter((entry) => !result.some((picked) => picked.id === entry.id))
      .sort((a, b) => {
        const aCount = usageByGroup.get(a.groupId) ?? 0
        const bCount = usageByGroup.get(b.groupId) ?? 0
        if (aCount === bCount) return Math.random() - 0.5
        return aCount - bCount
      })

    leftovers.forEach((entry) => {
      if (result.length < choicesPerRound) result.push(entry)
    })
  }

  return result
}

export function generateSaveOneRounds<T extends SaveOneRoundChoice>({
  basePool,
  rounds,
  choicesPerRound,
}: GenerateRoundsParams<T>): SaveOneRound[] {
  if (basePool.length === 0 || choicesPerRound <= 0 || rounds <= 0) return []

  const usageByGroup = new Map<string, number>()
  const generated: SaveOneRound[] = []
  let availablePool = [...basePool]

  for (let index = 0; index < rounds; index += 1) {
    if (availablePool.length < choicesPerRound) {
      availablePool = [...basePool]
    }

    const choices = drawRoundChoices(availablePool, choicesPerRound, usageByGroup)

    choices.forEach((choice) => {
      usageByGroup.set(choice.groupId, (usageByGroup.get(choice.groupId) ?? 0) + 1)
    })

    const choiceIdSet = new Set(choices.map((choice) => choice.id))
    availablePool = availablePool.filter((entry) => !choiceIdSet.has(entry.id))

    generated.push({
      index,
      choices,
    })
  }

  return generated
}
