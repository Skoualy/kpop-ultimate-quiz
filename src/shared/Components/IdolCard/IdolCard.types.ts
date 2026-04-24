import type { IdolItem } from '../../../features/save-one/SaveOnePage.types'

export interface IdolCardProps {
  idol: IdolItem
  /** Size variant driven by number of choices in the round */
  size: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick: (idolId: string) => void
}
