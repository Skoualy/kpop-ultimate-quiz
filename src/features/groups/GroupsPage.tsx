import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '@/shared/Layout'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { ButtonControl } from '@/shared/Controls/ButtonControl'
import { FilterBadgeGroupControl } from '@/shared/Controls/FilterBadgeGroupControl'
import { LoadingSpinner } from '@/shared/Components/LoadingSpinner'
import { Card } from '@/shared/Components/Card'
import { PaginationControl } from '@/shared/Components/PaginationControl'
import { Badge } from '@/shared/PureComponents/Badge'
import { CATEGORY_LABELS, GENERATIONS } from '@/shared/constants'
import { PLACEHOLDER_PATHS, resolveGroupCover } from '@/shared/utils/placeholder'
import type { GroupCategory, GroupStatus } from '@/shared/models'
import type { GroupCardViewModel, GroupFilters } from './GroupsPage.types'
import styles from './GroupsPage.module.scss'

const CATEGORY_OPTIONS: { value: GroupFilters['category']; label: string }[] = [
  { value: 'all', label: 'Toutes catégories' },
  { value: 'girlGroup', label: 'Girl groups' },
  { value: 'boyGroup', label: 'Boy groups' },
  { value: 'femaleSoloist', label: 'Soloist (F)' },
  { value: 'maleSoloist', label: 'Soloist (M)' },
]

const STATUS_OPTIONS: { value: GroupFilters['status']; label: string }[] = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
]

const PAGE_SIZE_OPTIONS = [6, 12, 18, 24]

function getCategoryBadgeVariant(category: GroupCategory) {
  if (category === 'girlGroup') return 'girl' as const
  if (category === 'boyGroup') return 'boy' as const
  return 'soloist' as const
}

function getStatusBadgeVariant(status: GroupStatus) {
  return status === 'active' ? ('success' as const) : ('danger' as const)
}

function mapGroupToCard(group: GroupCardViewModel['raw']): GroupCardViewModel {
  const currentMembersCount = group.members.filter((member) => member.status === 'current').length

  return {
    id: group.id,
    name: group.name,
    category: group.category,
    status: group.status,
    generation: group.generation,
    company: group.company,
    coverImage: resolveGroupCover(group),
    currentMembersCount,
    raw: group,
  }
}

export default function GroupsPage() {
  const navigate = useNavigate()
  const { data: groups, loading, error, refetch } = useGroupList()

  const [filters, setFilters] = useState<GroupFilters>({
    search: '',
    category: 'all',
    generation: 'all',
    status: 'all',
  })

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  const allCards = useMemo(
    () => (groups ?? []).map(mapGroupToCard).sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  )

  const visibleCategoryOptions = useMemo(() => {
    const datasetCategories = new Set(allCards.map((group) => group.category))
    return CATEGORY_OPTIONS.filter(
      (option) => option.value === 'all' || datasetCategories.has(option.value as GroupCategory),
    )
  }, [allCards])

  const visibleGenerationOptions = useMemo(() => {
    const datasetGenerations = new Set(allCards.map((group) => group.generation))
    return [
      { value: 'all' as const, label: 'Toutes gen.' },
      ...GENERATIONS.filter((gen) => datasetGenerations.has(gen)).map((gen) => ({ value: gen, label: `Gen ${gen}` })),
    ]
  }, [allCards])

  const filteredGroups = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase()

    return allCards.filter((group) => {
      if (normalizedSearch && !group.name.toLowerCase().includes(normalizedSearch)) return false
      if (filters.category !== 'all' && group.category !== filters.category) return false
      if (filters.generation !== 'all' && group.generation !== filters.generation) return false
      if (filters.status !== 'all' && group.status !== filters.status) return false
      return true
    })
  }, [allCards, filters])

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredGroups.slice(start, start + pageSize)
  }, [filteredGroups, page, pageSize])

  function updateFilter<K extends keyof GroupFilters>(key: K, value: GroupFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  return (
    <PageContainer
      title="Gestion des artistes"
      subtitle="Clique sur un artiste pour modifier ses informations dans le contributor."
      actions={
        <div className={styles.headerActions}>
          <ButtonControl variant="ghost" size="sm" onClick={() => navigate('/')}>
            ← Retour au quiz
          </ButtonControl>
          <ButtonControl variant="primary" size="sm" onClick={() => navigate('/contributor')}>
            ✦ Nouveau artiste
          </ButtonControl>
        </div>
      }
    >
      <div className={styles.page}>
        <div className={styles.searchRow}>
          <input
            className={['input', styles.searchInput].join(' ')}
            type="text"
            placeholder="Rechercher un artiste..."
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <FilterBadgeGroupControl
            single
            options={visibleCategoryOptions}
            value={[filters.category]}
            onChange={(values) => updateFilter('category', values[0] ?? 'all')}
          />

          <div className={styles.filterRow}>
            <FilterBadgeGroupControl
              single
              options={visibleGenerationOptions}
              value={[filters.generation]}
              onChange={(values) => updateFilter('generation', values[0] ?? 'all')}
            />
            <span className={styles.count}>{filteredGroups.length} artiste(s)</span>
          </div>

          <FilterBadgeGroupControl
            single
            options={STATUS_OPTIONS}
            value={[filters.status]}
            onChange={(values) => updateFilter('status', values[0] ?? 'all')}
          />
        </div>

        {loading && (
          <Card className={styles.stateCard}>
            <LoadingSpinner label="Chargement des artistes..." />
          </Card>
        )}

        {!loading && error && (
          <Card className={styles.stateCard}>
            <p className={styles.stateTitle}>Impossible de charger les artistes</p>
            <p>{error}</p>
            <ButtonControl variant="secondary" size="sm" onClick={refetch}>
              Réessayer
            </ButtonControl>
          </Card>
        )}

        {!loading && !error && filteredGroups.length === 0 && (
          <Card className={styles.stateCard}>
            <p className={styles.stateTitle}>Aucun artiste trouvé</p>
            <p>Essaie de modifier les filtres ou la recherche.</p>
          </Card>
        )}

        {!loading && !error && filteredGroups.length > 0 && (
          <>
            <div className={styles.grid}>
              {paginatedGroups.map((group) => (
                <Card key={group.id} className={styles.groupCard}>
                  <div className={styles.cardTop}>
                    <img
                      className={styles.cover}
                      src={group.coverImage}
                      alt={`Cover ${group.name}`}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null
                        event.currentTarget.src = PLACEHOLDER_PATHS.groupCover
                      }}
                    />

                    <div>
                      <h2 className={styles.cardName}>{group.name}</h2>
                      <div className={styles.badges}>
                        <Badge variant={getCategoryBadgeVariant(group.category)}>
                          {CATEGORY_LABELS[group.category]}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(group.status)}>
                          {group.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                        <Badge variant="teal">Gen {group.generation}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className={styles.meta}>
                    <span>
                      🏢 <strong>{group.company || 'N/A'}</strong>
                    </span>
                  </div>

                  <hr className={styles.separator} />

                  <div className={styles.cardFooter}>
                    <span className={styles.membersCount}>👥 {group.currentMembersCount} membre(s) actuel(s)</span>
                    <ButtonControl size="sm" onClick={() => navigate(`/contributor/${group.id}`)}>
                      ✏️ Modifier
                    </ButtonControl>
                  </div>
                </Card>
              ))}
            </div>

            <PaginationControl
              currentPage={page}
              totalItems={filteredGroups.length}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </PageContainer>
  )
}
