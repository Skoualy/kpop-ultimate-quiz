import type { Group, Generation, GroupCategory, GroupStatus } from '@/shared/models'

export type GroupCategoryFilter = 'all' | GroupCategory
export type GenerationFilter = 'all' | Generation
export type GroupStatusFilter = 'all' | GroupStatus

export interface GroupFilters {
  search: string
  category: GroupCategoryFilter
  generation: GenerationFilter
  status: GroupStatusFilter
}

export interface GroupCardViewModel {
  id: string
  name: string
  category: GroupCategory
  status: GroupStatus
  generation: Generation
  company: string
  coverImage: string
  currentMembersCount: number
  raw: Group
}
