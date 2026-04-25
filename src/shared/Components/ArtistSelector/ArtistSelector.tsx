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
  { value: 'all' satisfies ArtistSelectionMode, label: 'Tous' },
  { value: 'byFilter' satisfies ArtistSelectionMode, label: 'Par filtres' },
  { value: 'manual' satisfies ArtistSelectionMode, label: 'Manuel' },
] as const

// ─── Tile artiste ─────────────────────────────────────────────────────────────

function ArtistTile({ group, onRemove }: { group: Group; onRemove?: () => void }) {
  const coverSrc = group.coverImage
    ? group.coverImage.startsWith('/')
      ? group.coverImage
      : `/assets/${group.coverImage}`
    : null
  const isSoloist = group.category === 'femaleSoloist' || group.category === 'maleSoloist'
  const genderIcon = group.category === 'girlGroup' || group.category === 'femaleSoloist' ? '♀' : '♂'

  return (
    <div className={styles.tile}>
      <div className={styles.tileCover}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={group.name}
            className={styles.tileCoverImg}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
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
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
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
 * ArtistSelector — sélection des groupes/artistes pour la configuration.
 *
 * 3 modes :
 * - Tous       : tous les groupes, aucune sélection personnalisée
 * - Par filtres: filtres génération / catégorie / année / label
 * - Manuel     : EntityAutoSuggest + grille de tiles avec suppression individuelle
 *
 * Règle de mémoire :
 * - La sélection manuelle est conservée indépendamment du mode actif.
 * - Passer en mode "Tous" ou "Par filtres" ne efface pas la sélection manuelle.
 * - "Vider" efface uniquement la sélection manuelle et repasse en mode "Tous".
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
    if (artistMode === 'all') return allGroups
    if (artistMode === 'byFilter') return byFilterGroups
    // Manual : afficher uniquement les groupes sélectionnés manuellement
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
    if (artistMode === 'all') return `${n} artiste${suffix} inclus (tous)`
    if (artistMode === 'byFilter') return `${n} artiste${suffix} correspondant aux filtres`
    return `${n} artiste${suffix} sélectionné${n > 1 ? 's' : ''}`
  }, [artistMode, allGroups.length, byFilterGroups.length, manualSelectedIds.length])

  const handleModeChange = (mode: string) => {
    onArtistModeChange(mode as ArtistSelectionMode)
  }

  const handleClear = () => {
    onManualSelectionChange([])
    onArtistModeChange('all')
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
          <FilterBadgeGroupControl
            options={genOptions}
            value={[filters.gen]}
            onChange={(v) => onFilterChange({ gen: v[0] ?? 'all' })}
            single
            size="sm"
          />
          <FilterBadgeGroupControl
            options={catOptions}
            value={[filters.cat]}
            onChange={(v) => onFilterChange({ cat: v[0] ?? 'all' })}
            single
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
            placeholder="Rechercher un groupe ou artiste…"
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

      {/* En-tête */}
      {displayedGroups.length > 0 && (
        <div className={styles.header}>
          <span className={styles.headerTitle}>{countLabel}</span>
          {/* Bouton "Vider" — visible si sélection manuelle non vide */}
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
