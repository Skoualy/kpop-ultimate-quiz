import { useMemo } from 'react'
import { SegmentedControl } from '@/shared/Controls/SegmentedControl'
import { FilterBadgeGroupControl } from '@/shared/Controls/FilterBadgeGroupControl'
import { EntityAutoSuggest } from '@/shared/Controls/EntityAutoSuggest'
import { ConfigCard } from '@/shared/PureComponents/ConfigCard'
import { LoadingSpinner } from '@/shared/Components/LoadingSpinner'
import type { Group } from '@/shared/models'
import type { ArtistSelectionMode, ArtistSelectorProps } from './ArtistSelector.types'
import styles from './ArtistSelector.module.scss'
import { SelectControl } from '@/shared'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ARTIST_MODE_OPTIONS = [
  { value: 'all'      satisfies ArtistSelectionMode, label: 'Tous' },
  { value: 'byFilter' satisfies ArtistSelectionMode, label: 'Par filtres' },
  { value: 'manual'   satisfies ArtistSelectionMode, label: 'Manuel' },
] as const

// ─── Tile artiste ─────────────────────────────────────────────────────────────

function ArtistTile({ group, onRemove }: { group: Group; onRemove?: () => void }) {
  const coverSrc = group.coverImage
    ? group.coverImage.startsWith('/')
      ? group.coverImage
      : `/assets/${group.coverImage}`
    : null
  const isSoloist  = group.category === 'femaleSoloist' || group.category === 'maleSoloist'
  const genderIcon = group.category === 'girlGroup' || group.category === 'femaleSoloist' ? '♀' : '♂'

  return (
    <div className={styles.tile}>
      <div className={styles.tileCover}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={group.name}
            className={styles.tileCoverImg}
            onError={(e) => { ;(e.currentTarget as HTMLImageElement).style.display = 'none' }}
            draggable={false}
          />
        ) : (
          <span className={styles.tilePlaceholder}>{genderIcon}</span>
        )}
      </div>
      <span className={styles.tileName}>{group.name}</span>
      {group.parentGroupId && (
        <span className={styles.badgeSub}>SUB {group.category === 'girlGroup' ? '(F)' : '(M)'}</span>
      )}
      {isSoloist && <span className={styles.badgeSolo}>SOLO {group.category === 'femaleSoloist' ? '(F)' : '(M)'}</span>}
      {onRemove && (
        <button
          type="button"
          className={styles.tileRemove}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          title={`Retirer ${group.name}`}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * ArtistSelector — sélection des artistes pour la configuration.
 *
 * 3 modes :
 * - Tous       : tous les artistes, aucune sélection personnalisée
 * - Par filtres : filtres génération (multi) / catégorie (multi) / année / label
 * - Manuel     : EntityAutoSuggest + grille de tiles avec suppression individuelle
 *
 * Règle de mémoire :
 * - La sélection manuelle est conservée indépendamment du mode actif.
 * - "Vider" efface la sélection manuelle mais RESTE en mode Manuel.
 */
export function ArtistSelector({
  artistMode,
  onArtistModeChange,
  manualSelectedIds,
  onManualSelectionChange,
  allGroups,
  loading,
  filters,
  onFilterChange,
  byFilterGroups,
  genOptions,
  catOptions,
  availableYears,
  availableLabels,
}: ArtistSelectorProps) {
  // Groupes affichés dans la grille selon le mode actif
  const displayedGroups = useMemo<Group[]>(() => {
    if (artistMode === 'all')      return allGroups
    if (artistMode === 'byFilter') return byFilterGroups
    return manualSelectedIds.map((id) => allGroups.find((g) => g.id === id)).filter(Boolean) as Group[]
  }, [artistMode, allGroups, byFilterGroups, manualSelectedIds])

  // Libellé du compteur d'artistes
  const countLabel = useMemo(() => {
    const n =
      artistMode === 'all'
        ? allGroups.length
        : artistMode === 'byFilter'
          ? byFilterGroups.length
          : manualSelectedIds.length
    const suffix = n > 1 ? 's' : ''
    if (artistMode === 'all')      return `${n} artiste${suffix} inclus (tous)`
    if (artistMode === 'byFilter') return `${n} artiste${suffix} correspondant aux filtres`
    return `${n} artiste${suffix} sélectionné${n > 1 ? 's' : ''}`
  }, [artistMode, allGroups.length, byFilterGroups.length, manualSelectedIds.length])

  const handleModeChange = (mode: string) => {
    onArtistModeChange(mode as ArtistSelectionMode)
  }

  /**
   * FIX : "Vider" efface la sélection manuelle mais reste en mode Manuel.
   * Avant : appelait onArtistModeChange('all') → forçait le mode Tous.
   */
  const handleClear = () => {
    onManualSelectionChange([])
    // Ne PAS changer le mode — rester en 'manual' avec 0 groupes sélectionnés
  }

  const handleRemoveGroup = (id: string) => {
    onManualSelectionChange(manualSelectedIds.filter((mid) => mid !== id))
  }

  return (
    <ConfigCard>
      {/* Ligne : SegmentedControl | Vider | EntityAutoSuggest */}
      <div className={styles.controlRow}>
        <SegmentedControl
          options={ARTIST_MODE_OPTIONS as unknown as { value: string; label: string }[]}
          value={artistMode}
          onChange={handleModeChange}
        />
      </div>

      {/* Filtres — mode byFilter uniquement */}
      {artistMode === 'byFilter' && (
        <div className={styles.filters}>
          {/*
            FIX : génération en multi-select (pas de `single`).
            Les options disponibles sont calculées par le parent selon les autres filtres.
            Une sélection vide = toutes les générations.
          */}
          <FilterBadgeGroupControl
            options={genOptions}
            value={filters.gens}
            onChange={(v) => onFilterChange({ gens: v })}
            size="sm"
          />

          {/*
            FIX : catégorie en multi-select (pas de `single`).
            Idem : options intelligentes fournies par le parent.
          */}
          <FilterBadgeGroupControl
            options={catOptions}
            value={filters.cats}
            onChange={(v) => onFilterChange({ cats: v })}
            size="sm"
          />

          <SelectControl
            className={styles.filterSelect}
            value={filters.year}
            onChange={(value) => onFilterChange({ year: value })}
            allOptionsLabel={'Toutes les années'}
            options={availableYears.map((y) => ({ value: y, label: y }))}
          />
          <SelectControl
            className={styles.filterSelect}
            value={filters.label}
            onChange={(value) => onFilterChange({ label: value })}
            allOptionsLabel={'Tous les labels'}
            options={availableLabels.map((y) => ({ value: y, label: y }))}
          />
        </div>
      )}

      {/* EntityAutoSuggest — visible en mode Manuel uniquement */}
      {artistMode === 'manual' && (
        <div className={styles.autosuggestWrapper}>
          <EntityAutoSuggest<Group>
            placeholder="Rechercher un artiste…"
            items={allGroups}
            selectedIds={manualSelectedIds}
            onChange={onManualSelectionChange}
            getId={(g) => g.id}
            getLabel={(g) => g.name}
            getMeta={(g) => `Gen ${g.generation}`}
            multiple
            allowNewItem={false}
            emptyMessage="Aucun artiste trouvé"
            maxSuggestions={8}
          />
        </div>
      )}

      {/* En-tête avec compteur + bouton Vider */}
      {displayedGroups.length > 0 && (
        <div className={styles.header}>
          <span className={styles.headerTitle}>{countLabel}</span>
          {manualSelectedIds.length > 0 && artistMode === 'manual' && (
            <button type="button" className={styles.clearBtn} onClick={handleClear} title="Vider la sélection manuelle">
              🗑 Vider
            </button>
          )}
        </div>
      )}

      {/* Grille de tiles */}
      {loading ? (
        <LoadingSpinner label="Chargement des artistes…" />
      ) : displayedGroups.length === 0 ? (
        <p className={styles.empty}>
          {artistMode === 'byFilter'
            ? 'Aucun artiste ne correspond à ces filtres.'
            : artistMode === 'manual'
              ? 'Aucun artiste sélectionné. Utilisez la recherche ci-dessus.'
              : 'Aucun artiste disponible.'}
        </p>
      ) : (
        <div className={styles.grid}>
          {displayedGroups.map((g) => (
            <ArtistTile
              key={g.id}
              group={g}
              onRemove={artistMode === 'manual' ? () => handleRemoveGroup(g.id) : undefined}
            />
          ))}
        </div>
      )}
    </ConfigCard>
  )
}
