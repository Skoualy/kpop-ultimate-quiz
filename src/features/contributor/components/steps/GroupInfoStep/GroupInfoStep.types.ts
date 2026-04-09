import type { GroupCategory, GroupStatus, Generation } from '@/shared/models'

export interface GroupForm {
  id: string
  name: string
  category: GroupCategory
  parentGroupId: string
  generation: Generation | ''
  debutYear: string
  status: GroupStatus
  company: string
  coverImage: string
  coverFile: File | null
  fandomName: string
  notes: string
}

export function emptyGroupForm(): GroupForm {
  return {
    id: '',
    name: '',
    category: 'girlGroup',
    parentGroupId: '',
    generation: '',
    debutYear: '',
    status: 'active',
    company: '',
    coverImage: '',
    coverFile: null,
    fandomName: '',
    notes: '',
  }
}
