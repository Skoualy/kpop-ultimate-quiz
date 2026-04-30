import { useMemo } from 'react'
import { SegmentedControl } from '@/shared/Controls/SegmentedControl'
import { BadgeGroupControl } from '@/shared/Controls/BadgeGroupControl'
import { SelectControl } from '@/shared/Controls/SelectControl'
import { EntityAutoSuggest } from '@/shared/Controls/EntityAutoSuggest'
import { ConfigCard } from '@/shared/PureComponents/ConfigCard'
import { LoadingSpinner } from '@/shared/Components/LoadingSpinner'
import { ALL_OPTION_VALUE } from '@/shared/constants/common'
import type { Group } from '@/shared/models'
import type { ArtistSelectionMode, ArtistSelectorProps } from './ArtistSelector.types'
import styles from './ArtistSelector.module.scss'

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
 * ArtistSelector — sélection des artistes pour la configuration.
 *
 * 3 modes :
 * - Tous       : tous les artistes disponibles, pas de sélection personnalisée
 * - Par filtres : filtres génération (multi) / catégorie (multi) / année / label → layout 2 colonnes
 * - Manuel     : EntityAutoSuggest + grille de tiles avec suppression individuelle
 *
 * Règle de mémoire :
 * - La sélection manuelle est conservée indépendamment du mode actif.
 * - "Vider" efface la sélection manuelle mais reste en mode Manuel.
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
  // Groupes affichés dans la grille selon le mode
  const displayedGroups = useMemo<Group[]>(() => {
    if (artistMode === 'all') return allGroups
    if (artistMode === 'byFilter') return byFilterGroups
    return manualSelectedIds.map((id) => allGroups.find((g) => g.id === id)).filter(Boolean) as Group[]
  }, [artistMode, allGroups, byFilterGroups, manualSelectedIds])

  // Libellé du compteur
  const countLabel = useMemo(() => {
    const n =
      artistMode === 'all'
        ? allGroups.length
        : artistMode === 'byFilter'
          ? byFilterGroups.length
          : manualSelectedIds.length
    const s = n > 1 ? 's' : ''
    if (artistMode === 'all') return `${n} artiste${s} inclus (tous)`
    if (artistMode === 'byFilter') return `${n} artiste${s} correspondant aux filtres`
    return `${n} artiste${s} sélectionné${n > 1 ? 's' : ''}`
  }, [artistMode, allGroups.length, byFilterGroups.length, manualSelectedIds.length])

  function handleModeChange(mode: string) {
    onArtistModeChange(mode as ArtistSelectionMode)
  }

  // "Vider" efface la sélection manuelle mais reste en mode Manuel
  function handleClear() {
    onManualSelectionChange([])
  }

  function handleRemoveGroup(id: string) {
    onManualSelectionChange(manualSelectedIds.filter((mid) => mid !== id))
  }

  // ── Blocs réutilisés (header + grille) ────────────────────────────────────

  const headerEl =
    displayedGroups.length > 0 ? (
      <div className={styles.header}>
        <span className={styles.headerTitle}>{countLabel}</span>
        {manualSelectedIds.length > 0 && artistMode === 'manual' && (
          <button type="button" className={styles.clearBtn} onClick={handleClear} title="Vider la sélection manuelle">
            🗑 Vider
          </button>
        )}
      </div>
    ) : null

  const gridEl = loading ? (
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
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ConfigCard>
      {/* Ligne 1 : sélecteur de mode (toujours visible) */}
      <div className={styles.modeRow}>
        <SegmentedControl
          options={ARTIST_MODE_OPTIONS as unknown as { value: string; label: string }[]}
          value={artistMode}
          onChange={handleModeChange}
        />
      </div>

      {/* Mode "Par filtres" : layout 2 colonnes (filtres | grille) */}
      {artistMode === 'byFilter' && (
        <div className={styles.byFilterLayout}>
          {/* Colonne gauche : filtres empilés verticalement */}
          <div className={styles.filterPanel}>
            <div className={styles.filterContainer}>
              <BadgeGroupControl
                options={genOptions}
                allOptionLabel="Toutes les gens."
                value={filters.gens}
                onChange={(v) => onFilterChange({ gens: v })}
                isMultiselect
                size="sm"
              />
            </div>
            <div className={styles.filterContainer}>
              <BadgeGroupControl
                options={catOptions}
                allOptionLabel="Toutes catégories"
                value={filters.cats}
                onChange={(v) => onFilterChange({ cats: v })}
                isMultiselect
                size="sm"
              />
            </div>

            <div className={styles.filterContainer}>
              <SelectControl
                value={filters.year}
                onChange={(value) => onFilterChange({ year: value })}
                allOptionsLabel="Toutes les années"
                options={availableYears.map((y) => ({ value: y, label: y }))}
              />
            </div>

            <div className={styles.filterContainer}>
              <SelectControl
                value={filters.label}
                onChange={(value) => onFilterChange({ label: value })}
                allOptionsLabel="Tous les labels"
                options={availableLabels.map((l) => ({ value: l, label: l }))}
              />
            </div>
          </div>

          {/* Colonne droite : compteur + grille scrollable */}
          <div className={styles.gridPanel}>
            {headerEl}
            {gridEl}
          </div>
        </div>
      )}

      {/* Mode "Manuel" : autosuggest puis grille */}
      {artistMode === 'manual' && (
        <>
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
          {headerEl}
          {gridEl}
        </>
      )}

      {/* Mode "Tous" : grille directe */}
      {artistMode === 'all' && (
        <>
          {headerEl}
          {gridEl}
        </>
      )}
    </ConfigCard>
  )
}
