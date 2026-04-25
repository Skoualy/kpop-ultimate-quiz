import type { GroupCategory, IdolGender } from '@/shared/models'

export const CATEGORIES: GroupCategory[] = ['girlGroup', 'boyGroup', 'femaleSoloist', 'maleSoloist']

export const CATEGORY_LABELS: Record<GroupCategory, string> = {
  girlGroup: 'Girl Group',
  boyGroup: 'Boy Group',
  femaleSoloist: 'Soliste (F)',
  maleSoloist: 'Soliste (M)',
}

/** Catégories autorisées comme artiste parent (top-level uniquement) */
export const PARENT_ELIGIBLE_CATEGORIES: GroupCategory[] = ['girlGroup', 'boyGroup']

/** Genre dérivé depuis la catégorie de l'artiste */
export const GENDER_BY_CATEGORY: Record<GroupCategory, IdolGender> = {
  girlGroup: 'f',
  boyGroup: 'm',
  femaleSoloist: 'f',
  maleSoloist: 'm',
}
