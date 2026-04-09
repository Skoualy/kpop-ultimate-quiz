import { useMemo } from 'react'
import type { Group, Idol, GameConfig } from '@/shared/models'
import { gameService } from '@/shared/services/gameService'

export function useIdolPool(groups: Group[], allIdols: Idol[], config: GameConfig) {
  return useMemo(
    () => gameService.buildIdolPool(groups, allIdols, config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups.map((g) => g.id).join(','), allIdols.length, config.criterion, config.roleFilters.join(',')],
  )
}
