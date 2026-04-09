import type { Group, Idol, GameConfig, SongWithGroup, IdolWithGroup } from '@/shared/models'
import { PERFORMANCE_ROLES } from '@/shared/constants'

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function buildSongPool(groups: Group[]): SongWithGroup[] {
  const pool: SongWithGroup[] = []
  for (const group of groups) {
    const allSongs = [...group.discography.titles, ...group.discography.bSides]
    for (const song of allSongs) {
      pool.push({ song, groupId: group.id, groupName: group.name })
    }
  }
  return pool
}

function buildIdolPool(groups: Group[], allIdols: Idol[], config: GameConfig): IdolWithGroup[] {
  const idolMap = new Map(allIdols.map((i) => [i.id, i]))
  const seen = new Set<string>()
  const pool: IdolWithGroup[] = []

  for (const group of groups) {
    for (const member of group.members) {
      if (seen.has(member.idolId)) continue
      const idol = idolMap.get(member.idolId)
      if (!idol) continue

      // Filtre par rôle si demandé
if (
  config.roleFilters.length > 0 &&
  !config.roleFilters.some((role) => member.roles.includes(role))
) {
  continue
}

      // Filtre criterion performance : limiter aux rôles performances
      if (config.criterion === 'performance') {
        const hasPerformanceRole = member.roles.some((r) => PERFORMANCE_ROLES.includes(r))
        if (!hasPerformanceRole) continue
      }

      // Filtre criterion leadership : limiter aux leaders
      if (config.criterion === 'leadership') {
        if (!member.roles.includes('leader')) continue
      }

      seen.add(member.idolId)
      pool.push({ idol, groupId: group.id, groupName: group.name, roles: member.roles })
    }
  }

  return pool
}

export const gameService = { shuffle, buildSongPool, buildIdolPool }
