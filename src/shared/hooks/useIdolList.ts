import { idolService } from '@/shared/services/idolService'
import { useAsync } from './useAsync'

export function useIdolList() {
  return useAsync(() => idolService.getAll())
}
