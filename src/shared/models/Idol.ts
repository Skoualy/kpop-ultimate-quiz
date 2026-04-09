import type { IdolGender, NationalityCode } from './enums'

export interface Idol {
  id: string
  name: string
  primaryGroupId: string
  gender: IdolGender
  nationality: NationalityCode
  portrait?: string | null
  notes?: string | null
}
