import type { Group } from '@/shared/models'

export type ArtistSelectionMode = 'all' | 'byFilter' | 'manual'

export interface ArtistFilterState {
  gen: string
  cat: string
  year: string
  label: string
}

export interface ArtistSelectorProps {
  /** Mode de sélection courant */
  artistMode: ArtistSelectionMode
  onArtistModeChange: (mode: ArtistSelectionMode) => void

  /** IDs sélectionnés manuellement (conservés indépendamment des filtres) */
  manualSelectedIds: string[]
  onManualSelectionChange: (ids: string[]) => void

  /** Tous les artistes disponibles */
  allGroups: Group[]
  loading: boolean

  /** Filtres actifs (mode byFilter) */
  filters: ArtistFilterState
  onFilterChange: (update: Partial<ArtistFilterState>) => void

  /** Groupes résultant des filtres courants */
  byFilterGroups: Group[]

  /** Options de filtre disponibles */
  genOptions: { value: string; label: string }[]
  catOptions: { value: string; label: string }[]
  availableYears: string[]
  availableLabels: string[]
}
