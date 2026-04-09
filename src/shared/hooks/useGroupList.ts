import { groupService } from '@/shared/services/groupService'
import { useAsync } from './useAsync'

export function useGroupList() {
  return useAsync(() => groupService.getAll())
}
