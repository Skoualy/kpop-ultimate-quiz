import type { GroupCategory, GroupStatus, Generation } from '@/shared/models'
import type { ImageCreditInput } from '@/shared/models/AssetCredit'

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
  /** Informations de crédit pour la cover du groupe */
  coverCredit: ImageCreditInput
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
    coverCredit: {
      sourceType: 'wikimedia',
      originalFileName: null,
      transformReport: null,
    },
  }
}
