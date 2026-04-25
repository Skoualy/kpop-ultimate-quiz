export type EntityId = string

export interface EntityAutoSuggestProps<T> {
  id?: string
  label?: string
  placeholder?: string
  helperText?: string

  items: T[]
  selectedIds: EntityId[]
  onChange: (selectedIds: EntityId[]) => void

  getId: (item: T) => EntityId
  getLabel: (item: T) => string

  /** Métadonnée affichée en petit dans les suggestions (id, artiste, année…) */
  getMeta?: (item: T) => string | undefined

  /** Id généré depuis la saisie courante — affiché en subtext si fourni */
  getGeneratedId?: (query: string) => string

  /** Recherche custom. Si absente, utilise defaultFilterEntities. */
  filterItems?: (items: T[], query: string) => T[]

  /** Tri custom optionnel */
  sortItems?: (items: T[], query: string) => T[]

  /** Permettre la création/proposition d'une nouvelle entité */
  allowNewItem?: boolean

  /** Label de l'action de création */
  newItemLabel?: (query: string, generatedId?: string) => string

  /** Callback déclenché quand l'utilisateur choisit de créer une nouvelle entité */
  onNewItem?: (query: string, generatedId?: string) => void

  /** Nombre max de suggestions visibles (défaut : 8) */
  maxSuggestions?: number

  /** Mode multi-select (défaut : true) */
  multiple?: boolean

  disabled?: boolean
  emptyMessage?: string

  className?: string
}
