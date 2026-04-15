import type { GameConfig, Group, Idol, SongEntry, SongType } from '@/shared/models'
import { gameService } from '@/shared/services/gameService'
import { getThumbnailUrl } from '@/shared/utils/youtube'
import { computeSongClipStart } from './songClipStart'

export interface SaveOneIdolItem {
  kind: 'idol'
  id: string
  idolId: string
  idolName: string
  portrait: string | null
  groupId: string
  groupName: string
  isFormer: boolean
}

export interface SaveOneSongItem {
  kind: 'song'
  id: string
  songId: string
  title: string
  youtubeUrl: string
  thumbnailUrl: string
  groupId: string
  groupName: string
  startSeconds: number
  unavailable: boolean
}

export type SaveOneItem = SaveOneIdolItem | SaveOneSongItem

export interface SaveOneRound<T extends SaveOneItem> {
  roundIndex: number
  items: T[]
}

function pickSongsByType(group: Group, songType: SongType): SongEntry[] {
  const titles = group.discography.titles
  const bSides = group.discography.bSides

  if (songType === 'titles') return titles
  if (songType === 'bSides') return bSides
  if (songType === 'debutSongs') {
    return [...titles, ...bSides].filter((song) => song.isDebutSong)
  }

  return [...titles, ...bSides]
}

export function buildIdolPool(groups: Group[], allIdols: Idol[], config: GameConfig): SaveOneIdolItem[] {
  const dedup = gameService.buildIdolPool(groups, allIdols, config)
  const memberMap = new Map<string, { groupId: string; memberStatus: 'current' | 'former' }>()

  for (const group of groups) {
    for (const member of group.members) {
      if (!memberMap.has(member.idolId)) {
        memberMap.set(member.idolId, { groupId: group.id, memberStatus: member.status })
      }
    }
  }

  return dedup.map(({ idol, groupId, groupName }) => {
    const memberRef = memberMap.get(idol.id)
    return {
      kind: 'idol',
      id: `idol-${idol.id}`,
      idolId: idol.id,
      idolName: idol.name,
      portrait: idol.portrait ?? null,
      groupId: idol.primaryGroupId || groupId,
      groupName,
      isFormer: memberRef?.memberStatus === 'former',
    }
  })
}

export function buildSongPool(groups: Group[], clipDuration: number, songType: SongType): SaveOneSongItem[] {
  const pool: SaveOneSongItem[] = []

  for (const group of groups) {
    for (const song of pickSongsByType(group, songType)) {
      pool.push({
        kind: 'song',
        id: `song-${song.id}-${group.id}`,
        songId: song.id,
        title: song.title,
        youtubeUrl: song.youtubeUrl,
        thumbnailUrl: getThumbnailUrl(song.youtubeUrl),
        groupId: group.id,
        groupName: group.name,
        startSeconds: computeSongClipStart({ clipDurationSeconds: clipDuration }),
        unavailable: !song.youtubeUrl,
      })
    }
  }

  return pool
}

function drawBalanced<T extends SaveOneItem>(
  available: T[],
  size: number,
  groupRoundCount: Map<string, number>,
): { picked: T[]; rest: T[] } {
  const rest = [...available]
  const picked: T[] = []
  const groupsInRound = new Set<string>()

  for (let i = 0; i < size; i += 1) {
    const candidates = [...rest]
    candidates.sort((a, b) => {
      const groupDelta = (groupRoundCount.get(a.groupId) ?? 0) - (groupRoundCount.get(b.groupId) ?? 0)
      if (groupDelta !== 0) return groupDelta
      const aPenalty = groupsInRound.has(a.groupId) ? 1 : 0
      const bPenalty = groupsInRound.has(b.groupId) ? 1 : 0
      if (aPenalty !== bPenalty) return aPenalty - bPenalty
      return Math.random() - 0.5
    })

    const candidate = candidates[0]
    if (!candidate) break

    const idx = rest.findIndex((item) => item.id === candidate.id)
    if (idx >= 0) {
      const [chosen] = rest.splice(idx, 1)
      if (chosen) {
        picked.push(chosen)
        groupsInRound.add(chosen.groupId)
      }
    }
  }

  return { picked, rest }
}

export function buildSaveOneRounds<T extends SaveOneItem>(
  basePool: T[],
  rounds: number,
  choiceCount: number,
): SaveOneRound<T>[] {
  if (basePool.length < choiceCount) return []

  const output: SaveOneRound<T>[] = []
  let available = gameService.shuffle(basePool)
  const groupRoundCount = new Map<string, number>()

  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    if (available.length < choiceCount) {
      available = gameService.shuffle(basePool)
    }

    const { picked, rest } = drawBalanced(available, choiceCount, groupRoundCount)
    if (picked.length < choiceCount) break

    picked.forEach((item) => {
      groupRoundCount.set(item.groupId, (groupRoundCount.get(item.groupId) ?? 0) + 1)
    })

    output.push({ roundIndex, items: picked })
    available = rest
  }

  return output
}
