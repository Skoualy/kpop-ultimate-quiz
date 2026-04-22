import { useState, useMemo, useRef, Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { PageContainer } from '@/shared/Layout'
import { LoadingSpinner } from '@/shared/Components/LoadingSpinner'
import { ToggleControl } from '@/shared/Controls/ToggleControl'
import { FilterBadgeGroupControl } from '@/shared/Controls/FilterBadgeGroupControl'
import { BadgeGroupControl } from '@/shared/Controls/BadgeGroupControl'
import { SegmentedControl } from '@/shared/Controls/SegmentedControl'
import { ConfigCard } from '@/shared/PureComponents/ConfigCard'
import {
  ROLES,
  ROLE_LABELS,
  CRITERIA_LABELS,
  GAME_PLAY_MODES,
  GAME_PLAY_MODE_MAP,
  TIMER_OPTIONS,
  getAvailableRolesForCriterion,
  filterRolesForCriterion,
} from '@/shared/constants'
import type {
  Group,
  QuizMode,
  QuizCategory,
  SaveOneCriterion,
  MemberRole,
  SongType,
  Generation,
  RoleCriterion,
  GameConfig,
} from '@/shared/models'
import { useConfigPreparation, type PreparationStatus } from '@/features/save-one/hooks/useConfigPreparation'
import type { MaxRoundsResult } from '@/features/save-one/helpers/poolScopeRules'
import type { GamePlayMode } from '@/shared/constants'
import styles from './ConfigPage.module.scss'

// ─── Types ────────────────────────────────────────────────────────────────────

type ArtistSelectionMode = 'all' | 'byFilter' | 'manual'
type GenFilter = 'all' | Generation
type CatFilter = 'all' | 'girlGroup' | 'boyGroup' | 'femaleSoloist' | 'maleSoloist' | 'subunit'

// ─── Constantes ───────────────────────────────────────────────────────────────

const SONG_TYPE_OPTIONS: { value: SongType; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'titles', label: 'Titles' },
  { value: 'bSides', label: 'B-sides' },
  { value: 'debutSongs', label: 'Debut songs' },
]

const CRITERIA_LIST: SaveOneCriterion[] = [
  'all',
  'beauty',
  'personality',
  'voice',
  'performance',
  'leadership',
  'aegyo',
  'random',
]

const CAT_FILTER_OPTIONS: { value: CatFilter; label: string }[] = [
  { value: 'all', label: 'Toutes catégories' },
  { value: 'girlGroup', label: 'Girls groups' },
  { value: 'boyGroup', label: 'Boys groups' },
  { value: 'femaleSoloist', label: 'Soloist (F)' },
  { value: 'maleSoloist', label: 'Soloist (M)' },
  { value: 'subunit', label: 'Sub-unit' },
]

const ARTIST_MODE_OPTIONS = [
  { value: 'all' as ArtistSelectionMode, label: 'Tous' },
  { value: 'byFilter' as ArtistSelectionMode, label: 'Par filtres' },
  { value: 'manual' as ArtistSelectionMode, label: 'Manuel' },
]

function genIcon(g: Group) {
  return g.category === 'girlGroup' || g.category === 'femaleSoloist' ? '♀' : '♂'
}

/**
 * Applique les filtres genre/catégorie/année/label sur une liste de groupes.
 */
function applyGroupFilters(groups: Group[], gen: GenFilter, cat: CatFilter, year: string, label: string): Group[] {
  return groups.filter((g) => {
    if (gen !== 'all' && g.generation !== gen) return false
    if (cat === 'girlGroup' && g.category !== 'girlGroup') return false
    if (cat === 'boyGroup' && g.category !== 'boyGroup') return false
    if (cat === 'femaleSoloist' && g.category !== 'femaleSoloist') return false
    if (cat === 'maleSoloist' && g.category !== 'maleSoloist') return false
    if (cat === 'subunit' && !g.parentGroupId) return false
    if (year !== 'all' && String(g.debutYear) !== year) return false
    if (label !== 'all' && g.company !== label) return false
    return true
  })
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const navigate = useNavigate()
  const { config, setConfig, resetConfig } = useGameContext()
  const { data: groups, loading } = useGroupList()

  const isSaveOne = config.mode === 'saveOne'
  const isIdols = config.category === 'idols'
  const isSongs = config.category === 'songs'
  const playMode = GAME_PLAY_MODE_MAP[config.gamePlayMode]
  const isCustom = config.gamePlayMode === 'custom'

  // ── Mode sélection artistes ─────────────────────────────────────────────────
  const [artistMode, setArtistMode] = useState<ArtistSelectionMode>(() =>
    config.selectedGroupIds.length === 0 ? 'all' : 'manual',
  )

  // ── Filtres artistes ────────────────────────────────────────────────────────
  const [genFilter, setGenFilter] = useState<GenFilter>('all')
  const [catFilter, setCatFilter] = useState<CatFilter>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [labelFilter, setLabelFilter] = useState<string>('all')

  // ── Dual-listbox state (mode Manuel) ────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [selAvail, setSelAvail] = useState<Set<string>>(new Set())
  const [selChosen, setSelChosen] = useState<Set<string>>(new Set())

  // ── Préparation ─────────────────────────────────────────────────────────────
  // FIX : patchConfig appelle setConfig(patch) directement — jamais sous forme fonctionnelle
  function patchConfig(patch: Partial<GameConfig>) {
    setConfig(patch)
  }

  const {
    prepared,
    status: prepStatus,
    result: prepResult,
    errorMessage: prepError,
    prepare,
  } = useConfigPreparation(config, patchConfig)

  // ── Validation 2 joueurs ────────────────────────────────────────────────────
  const p1Empty = config.twoPlayerMode && !config.player1Name.trim()
  const p2Empty = config.twoPlayerMode && !config.player2Name.trim()
  const twoPlayerInvalid = config.twoPlayerMode && (p1Empty || p2Empty)

  // ── Groupes dérivés ─────────────────────────────────────────────────────────
  const allGroups = useMemo(() => [...(groups ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [groups])

  const availableGens = useMemo<GenFilter[]>(() => {
    const gens = new Set<Generation>(allGroups.map((g) => g.generation as Generation))
    const order: Generation[] = ['1', '2', '3', '4', '5']
    return ['all', ...order.filter((g) => gens.has(g))]
  }, [allGroups])

  const availableYears = useMemo(() => {
    const years = [...new Set(allGroups.map((g) => String(g.debutYear)))].sort()
    return ['all', ...years]
  }, [allGroups])

  const availableLabels = useMemo(() => {
    const labels = [...new Set(allGroups.map((g) => g.company).filter(Boolean))].sort()
    return ['all', ...labels]
  }, [allGroups])

  const genFilterOptions = useMemo(
    () => availableGens.map((g) => ({ value: g, label: g === 'all' ? 'Toutes gen.' : `Gen ${g}` })),
    [availableGens],
  )

  const availableCatOptions = useMemo(() => {
    const cats = new Set(allGroups.map((g) => g.category))
    const hasSubunit = allGroups.some((g) => !!g.parentGroupId)
    return CAT_FILTER_OPTIONS.filter(
      (o) => o.value === 'all' || cats.has(o.value as Group['category']) || (o.value === 'subunit' && hasSubunit),
    )
  }, [allGroups])

  // Groupes filtrés par filtres (mode byFilter)
  const byFilterGroups = useMemo(
    () => applyGroupFilters(allGroups, genFilter, catFilter, yearFilter, labelFilter),
    [allGroups, genFilter, catFilter, yearFilter, labelFilter],
  )

  const selectedGroups = useMemo(
    () => config.selectedGroupIds.map((id) => allGroups.find((g) => g.id === id)).filter(Boolean) as Group[],
    [allGroups, config.selectedGroupIds],
  )

  // Groupes affichés dans la grille de tuiles (selon le mode)
  const displayedGroups = useMemo(() => {
    if (artistMode === 'all') return allGroups
    if (artistMode === 'byFilter') return byFilterGroups
    return selectedGroups
  }, [artistMode, allGroups, byFilterGroups, selectedGroups])

  // Groupes disponibles pour le dual-list (mode Manuel)
  const availableForList = useMemo(
    () =>
      allGroups
        .filter((g) => !config.selectedGroupIds.includes(g.id))
        .filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase())),
    [allGroups, config.selectedGroupIds, search],
  )

  const availableRoles = useMemo(() => getAvailableRolesForCriterion(config.criterion, ROLES), [config.criterion])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handlePlayModeChange(mode: GamePlayMode) {
    const preset = GAME_PLAY_MODE_MAP[mode]
    setConfig({ gamePlayMode: mode, timerSeconds: preset.timerDefault, clipDuration: preset.clipDefault })
  }

  function handleTwoPlayerToggle(v: boolean) {
    const patch: Partial<GameConfig> = { twoPlayerMode: v }
    if (v) {
      if (!config.player1Name.trim()) patch.player1Name = 'Joueur 1'
      if (!config.player2Name.trim()) patch.player2Name = 'Joueur 2'
    }
    setConfig(patch)
  }

  function handleCriterionChange(criterion: SaveOneCriterion) {
    const cleaned = filterRolesForCriterion(config.roleFilters, criterion, ROLES)
    setConfig({ criterion, roleFilters: cleaned })
  }

  /** Change le mode de sélection des artistes */
  function handleArtistModeChange(mode: ArtistSelectionMode) {
    setArtistMode(mode)
    if (mode === 'all') {
      // Tous = selectedGroupIds vide (le game engine utilisera tous les groupes)
      setConfig({ selectedGroupIds: [] })
    } else if (mode === 'byFilter') {
      // Appliquer immédiatement les filtres courants
      setConfig({ selectedGroupIds: byFilterGroups.map((g) => g.id) })
    }
    // mode 'manual' → garder selectedGroupIds tel quel
  }

  /** Changer un filtre en mode byFilter → mettre à jour selectedGroupIds */
  function handleFilterChange(update: { gen?: GenFilter; cat?: CatFilter; year?: string; label?: string }) {
    const newGen = update.gen ?? genFilter
    const newCat = update.cat ?? catFilter
    const newYear = update.year ?? yearFilter
    const newLabel = update.label ?? labelFilter

    if (update.gen !== undefined) setGenFilter(newGen)
    if (update.cat !== undefined) setCatFilter(newCat)
    if (update.year !== undefined) setYearFilter(newYear)
    if (update.label !== undefined) setLabelFilter(newLabel)

    if (artistMode === 'byFilter') {
      const filtered = applyGroupFilters(allGroups, newGen, newCat, newYear, newLabel)
      setConfig({ selectedGroupIds: filtered.map((g) => g.id) })
    }
  }

  // ── Dual-list transfers ─────────────────────────────────────────────────────

  function addGroup(id: string) {
    if (!config.selectedGroupIds.includes(id)) setConfig({ selectedGroupIds: [...config.selectedGroupIds, id] })
  }
  function removeGroup(id: string) {
    setConfig({ selectedGroupIds: config.selectedGroupIds.filter((x) => x !== id) })
  }
  function moveRight() {
    setConfig({ selectedGroupIds: [...new Set([...config.selectedGroupIds, ...[...selAvail]])] })
    setSelAvail(new Set())
  }
  function moveAllRight() {
    setConfig({ selectedGroupIds: [...new Set([...config.selectedGroupIds, ...availableForList.map((g) => g.id)])] })
    setSelAvail(new Set())
  }
  function moveLeft() {
    setConfig({ selectedGroupIds: config.selectedGroupIds.filter((id) => ![...selChosen].includes(id)) })
    setSelChosen(new Set())
  }
  function moveAllLeft() {
    setConfig({ selectedGroupIds: [] })
    setSelChosen(new Set())
  }
  function toggleAvail(id: string) {
    setSelAvail((p) => {
      const n = new Set(p)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleChosen(id: string) {
    setSelChosen((p) => {
      const n = new Set(p)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  // ── canLaunch ───────────────────────────────────────────────────────────────

  const canLaunch = !twoPlayerInvalid && (isCustom ? prepared : true)

  function launch() {
    if (!canLaunch) return
    navigate(config.mode === 'blindTest' ? '/game/blind-test' : '/game/save-one')
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Configuration</h1>
        <div className={styles.pageHeaderActions}>
          <button className="btn btn--secondary" onClick={resetConfig}>
            Reset config
          </button>
          {isCustom && !prepared ? (
            <button
              className="btn btn--primary"
              onClick={prepare}
              disabled={prepStatus === 'loading' || twoPlayerInvalid}
              style={{ minWidth: 180 }}
            >
              {prepStatus === 'loading' ? '⏳ Vérification…' : '🔍 Préparer la partie'}
            </button>
          ) : (
            <button className="btn btn--primary" onClick={launch} disabled={!canLaunch} style={{ minWidth: 180 }}>
              ▶ Lancer la partie
            </button>
          )}
        </div>
      </div>

      {/* ── Banners préparation ── */}
      {isCustom && <PrepBanner status={prepStatus} result={prepResult} error={prepError} styles={styles} />}

      {/* ══ CHOIX DU JEU ══ */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Choix du jeu</p>
        <ConfigCard>
          <div className={styles.fieldsRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Type de quiz</span>
              <select
                className="select"
                value={config.mode}
                onChange={(e) => setConfig({ mode: e.target.value as QuizMode })}
              >
                <option value="saveOne">Save One</option>
                <option value="blindTest">Blind Test</option>
                <option value="tournament" disabled>
                  Tournoi — bientôt disponible
                </option>
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Catégorie</span>
              <select
                className="select"
                value={config.category}
                onChange={(e) => setConfig({ category: e.target.value as QuizCategory })}
              >
                <option value="idols">Idoles</option>
                <option value="songs">Chansons</option>
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Mode de jeu</span>
              <select
                className="select"
                value={config.gamePlayMode}
                onChange={(e) => handlePlayModeChange(e.target.value as GamePlayMode)}
              >
                {GAME_PLAY_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ConfigCard>
      </div>

      {/* ══ OPTIONS DE LA PARTIE ══ */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Options de la partie</p>
        <ConfigCard>
          <div className={styles.fieldsRow}>
            {isSaveOne && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Drops (1–3)</span>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={3}
                  value={config.drops}
                  onChange={(e) => setConfig({ drops: Math.max(1, Math.min(3, parseInt(e.target.value) || 1)) })}
                />
                <span className={styles.fieldHint}>{config.drops + 1} choix par round</span>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Rounds (1–20)</span>
              <input
                type="number"
                className="input"
                min={1}
                max={20}
                value={config.rounds}
                onChange={(e) => setConfig({ rounds: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
              />
            </div>
            <div
              className={[styles.field, !playMode.timerEditable ? styles.fieldDisabled : ''].filter(Boolean).join(' ')}
            >
              <span className={styles.fieldLabel}>Timer</span>
              <select
                className="select"
                value={playMode.timerEditable ? config.timerSeconds : playMode.timerDefault}
                disabled={!playMode.timerEditable}
                onChange={(e) => setConfig({ timerSeconds: parseInt(e.target.value) })}
              >
                {TIMER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {!playMode.timerEditable && <span className={styles.fieldHint}>Fixé par le mode de jeu.</span>}
            </div>
            {isSongs && (
              <div
                className={[styles.field, !playMode.clipEditable ? styles.fieldDisabled : ''].filter(Boolean).join(' ')}
              >
                <span className={styles.fieldLabel}>Durée des extraits (1–15s)</span>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={15}
                  value={playMode.clipEditable ? config.clipDuration : playMode.clipDefault}
                  disabled={!playMode.clipEditable}
                  onChange={(e) =>
                    setConfig({ clipDuration: Math.max(1, Math.min(15, parseInt(e.target.value) || 5)) })
                  }
                />
                {!playMode.clipEditable && <span className={styles.fieldHint}>Fixé par le mode de jeu.</span>}
              </div>
            )}
          </div>
        </ConfigCard>

        {/* Mode 2 joueurs */}
        <div style={{ marginTop: 10 }}>
          <ConfigCard>
            <div className={styles.twoPlayerRow}>
              <div className={styles.twoPlayerLeft}>
                <ToggleControl checked={config.twoPlayerMode} onChange={handleTwoPlayerToggle} label="Mode 2 joueurs" />
                <span className={styles.twoPlayerDesc}>
                  Permet à deux joueurs de répondre chacun leur tour lors d'une partie.
                </span>
              </div>
              <div className={styles.twoPlayerFields}>
                <div className={styles.twoPlayerField}>
                  <span className={styles.fieldLabel}>Joueur 1</span>
                  <input
                    className="input"
                    value={config.player1Name}
                    placeholder="Joueur 1"
                    disabled={!config.twoPlayerMode}
                    onChange={(e) => setConfig({ player1Name: e.target.value })}
                  />
                  {p1Empty && <span className={styles.fieldError}>Pseudo requis</span>}
                </div>
                <div className={styles.twoPlayerField}>
                  <span className={styles.fieldLabel}>Joueur 2</span>
                  <input
                    className="input"
                    value={config.player2Name}
                    placeholder="Joueur 2"
                    disabled={!config.twoPlayerMode}
                    onChange={(e) => setConfig({ player2Name: e.target.value })}
                  />
                  {p2Empty && <span className={styles.fieldError}>Pseudo requis</span>}
                </div>
              </div>
            </div>
          </ConfigCard>
        </div>
      </div>

      {/* ══ OPTIONS SUPPLÉMENTAIRES (mode Custom) ══ */}
      {isCustom && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Options supplémentaires</p>

          {/* Critère / Rôles / Type chansons */}
          {(isIdols || isSongs) && (
            <ConfigCard>
              <div className={styles.advancedSection}>
                {isIdols && (
                  <>
                    <div className={styles.optionGroup}>
                      <span className={styles.fieldLabel}>Critère</span>
                      <BadgeGroupControl<SaveOneCriterion>
                        options={CRITERIA_LIST.map((c) => ({ value: c, label: CRITERIA_LABELS[c] }))}
                        value={[config.criterion]}
                        onChange={(v) => handleCriterionChange(v[0] ?? 'all')}
                        size="sm"
                      />
                    </div>
                    <div className={styles.optionGroup}>
                      <div>
                        <span className={styles.fieldLabel}>Rôles </span>
                        <span className={styles.fieldHint}>(plusieurs sélections possible)</span>
                      </div>
                      <BadgeGroupControl<RoleCriterion>
                        options={[
                          { value: 'all', label: 'Tous' },
                          ...availableRoles.map((r) => ({ value: r as RoleCriterion, label: ROLE_LABELS[r] })),
                        ]}
                        value={config.roleFilters.length === 0 ? ['all'] : (config.roleFilters as RoleCriterion[])}
                        onChange={(vals) => {
                          if (vals.includes('all') && config.roleFilters.length > 0) {
                            setConfig({ roleFilters: [] })
                          } else {
                            setConfig({ roleFilters: vals.filter((v) => v !== 'all') as MemberRole[] })
                          }
                        }}
                        isMultiselect
                        size="sm"
                      />
                    </div>
                  </>
                )}
                {isSongs && (
                  <>
                    <div className={styles.optionGroup}>
                      <span className={styles.fieldLabel}>Type de chansons</span>
                      <BadgeGroupControl<SongType>
                        options={SONG_TYPE_OPTIONS}
                        value={[config.songType]}
                        onChange={(v) => setConfig({ songType: v[0] ?? 'all' })}
                        size="sm"
                      />
                    </div>
                    {/* Filtre langue — UI ready, nécessite ajout de songLanguage dans GameConfig + pool builder */}
                    <div className={styles.optionGroup}>
                      <span className={styles.fieldLabel}>Langue</span>
                      <BadgeGroupControl<string>
                        options={[
                          { value: 'all', label: 'Tous' },
                          { value: 'korean', label: 'Coréen' },
                          { value: 'japanese', label: 'Japonais' },
                          { value: 'english', label: 'Anglais' },
                        ]}
                        value={['all']}
                        onChange={() => {
                          /* TODO: wired to config.songLanguage when added to GameConfig */
                        }}
                        size="sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </ConfigCard>
          )}

          {/* ── Sélection des artistes ── */}
          <ArtistSelector
            artistMode={artistMode}
            onArtistModeChange={handleArtistModeChange}
            allGroups={allGroups}
            displayedGroups={displayedGroups}
            byFilterGroups={byFilterGroups}
            selectedGroupIds={config.selectedGroupIds}
            selectedGroups={selectedGroups}
            availableForList={availableForList}
            selAvail={selAvail}
            selChosen={selChosen}
            search={search}
            setSearch={setSearch}
            genFilter={genFilter}
            catFilter={catFilter}
            yearFilter={yearFilter}
            labelFilter={labelFilter}
            genFilterOptions={genFilterOptions}
            catFilterOptions={availableCatOptions}
            availableYears={availableYears}
            availableLabels={availableLabels}
            onFilterChange={handleFilterChange}
            onAddGroup={addGroup}
            onRemoveGroup={removeGroup}
            toggleAvail={toggleAvail}
            toggleChosen={toggleChosen}
            moveRight={moveRight}
            moveAllRight={moveAllRight}
            moveLeft={moveLeft}
            moveAllLeft={moveAllLeft}
            loading={loading}
            styles={styles}
          />
        </div>
      )}
    </PageContainer>
  )
}

// ─── PrepBanner ───────────────────────────────────────────────────────────────

function PrepBanner({
  status,
  result,
  error,
  styles,
}: {
  status: PreparationStatus
  result: MaxRoundsResult | null
  error: string | null
  styles: Record<string, string>
}) {
  if (status === 'idle' || status === 'loading') return null

  if (status === 'adjusted' && result) {
    return (
      <div className={styles.prepBannerWrap}>
        <div className={[styles.prepBanner, styles.prepBannerWarning].join(' ')}>
          <span className={styles.prepBannerIcon}>⚠️</span>
          <div className={styles.prepBannerBody}>
            <strong className={styles.prepBannerTitle}>Rounds ajustés</strong>
            <span className={styles.prepBannerText}>
              Nombre de rounds réduit à <strong>{result.maxRounds}</strong> pour garantir des rounds complets sans
              répétition.
              {result.clampMessage && <> {result.clampMessage}</>}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'valid') {
    return (
      <div className={styles.prepBannerWrap}>
        <div className={[styles.prepBanner, styles.prepBannerSuccess].join(' ')}>
          <span className={styles.prepBannerIcon}>✓</span>
          <span className={styles.prepBannerText}>Config validée. La partie peut être lancée.</span>
        </div>
      </div>
    )
  }

  if (status === 'invalid' && error) {
    return (
      <div className={styles.prepBannerWrap}>
        <div className={[styles.prepBanner, styles.prepBannerError].join(' ')}>
          <span className={styles.prepBannerIcon}>✗</span>
          <span className={styles.prepBannerText}>{error}</span>
        </div>
      </div>
    )
  }

  return null
}

// ─── ArtistTile ───────────────────────────────────────────────────────────────

function ArtistTile({
  group,
  onRemove,
  styles,
}: {
  group: Group
  onRemove?: () => void
  styles: Record<string, string>
}) {
  const coverSrc = group.coverImage
    ? group.coverImage.startsWith('/')
      ? group.coverImage
      : `/assets/${group.coverImage}`
    : null

  return (
    <div className={styles.artistTile}>
      <div className={styles.artistTileCover}>
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={group.name}
            className={styles.artistTileCoverImg}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
            draggable={false}
          />
        ) : (
          <span className={styles.artistTileCoverPlaceholder}>
            {group.category === 'girlGroup' || group.category === 'femaleSoloist' ? '♀' : '♂'}
          </span>
        )}
      </div>
      <span className={styles.artistTileName}>{group.name}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.artistTileRemove}
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

// ─── ArtistAutosuggest ────────────────────────────────────────────────────────

function ArtistAutosuggest({
  allGroups,
  selectedIds,
  onSelect,
  styles,
}: {
  allGroups: Group[]
  selectedIds: string[]
  onSelect: (id: string) => void
  styles: Record<string, string>
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    return allGroups
      .filter((g) => !selectedIds.includes(g.id) && g.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8)
  }, [allGroups, selectedIds, query])

  function handleSelect(id: string) {
    onSelect(id)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className={styles.autosuggest}>
      <input
        ref={inputRef}
        className={styles.autosuggestInput}
        placeholder="Ajouter un artiste..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <div className={styles.autosuggestDropdown}>
          {suggestions.map((g) => (
            <button key={g.id} type="button" className={styles.autosuggestItem} onClick={() => handleSelect(g.id)}>
              <span>{g.name}</span>
              <span className={styles.autosuggestMeta}>Gen {g.generation}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ArtistSelector ───────────────────────────────────────────────────────────

interface ArtistSelectorProps {
  artistMode: ArtistSelectionMode
  onArtistModeChange: (mode: ArtistSelectionMode) => void
  allGroups: Group[]
  displayedGroups: Group[]
  byFilterGroups: Group[]
  selectedGroupIds: string[]
  selectedGroups: Group[]
  availableForList: Group[]
  selAvail: Set<string>
  selChosen: Set<string>
  search: string
  setSearch: (v: string) => void
  genFilter: string
  catFilter: string
  yearFilter: string
  labelFilter: string
  genFilterOptions: { value: string; label: string }[]
  catFilterOptions: { value: string; label: string }[]
  availableYears: string[]
  availableLabels: string[]
  onFilterChange: (update: { gen?: GenFilter; cat?: CatFilter; year?: string; label?: string }) => void
  onAddGroup: (id: string) => void
  onRemoveGroup: (id: string) => void
  toggleAvail: (id: string) => void
  toggleChosen: (id: string) => void
  moveRight: () => void
  moveAllRight: () => void
  moveLeft: () => void
  moveAllLeft: () => void
  loading: boolean
  styles: Record<string, string>
}

function ArtistSelector({
  artistMode,
  onArtistModeChange,
  allGroups,
  displayedGroups,
  selectedGroupIds,
  selectedGroups,
  availableForList,
  selAvail,
  selChosen,
  search,
  setSearch,
  genFilter,
  catFilter,
  yearFilter,
  labelFilter,
  genFilterOptions,
  catFilterOptions,
  availableYears,
  availableLabels,
  onFilterChange,
  onAddGroup,
  onRemoveGroup,
  toggleAvail,
  toggleChosen,
  moveRight,
  moveAllRight,
  moveLeft,
  moveAllLeft,
  loading,
  styles,
}: ArtistSelectorProps) {
  const sortedDisplayed = [...displayedGroups].sort((a, b) => a.name.localeCompare(b.name))

  const countLabel =
    artistMode === 'all'
      ? `${displayedGroups.length} artiste${displayedGroups.length > 1 ? 's' : ''} inclus (tous)`
      : artistMode === 'byFilter'
        ? `${displayedGroups.length} artiste${displayedGroups.length > 1 ? 's' : ''} correspondant aux filtres`
        : `${selectedGroupIds.length} artiste${selectedGroupIds.length > 1 ? 's' : ''} sélectionné${selectedGroupIds.length > 1 ? 's' : ''}`

  return (
    <div style={{ marginTop: 10 }}>
      <ConfigCard>
        {/* En-tête */}
        <div className={styles.artistSelectorHeader}>
          <span className={styles.artistSelectorTitle}>Artistes / Groupes</span>
          <span className={styles.artistSelectorCount}>{countLabel}</span>
        </div>

        {/* Segmented control : Tous / Par filtres / Manuel */}
        <div className={styles.artistModeRow}>
          <SegmentedControl options={ARTIST_MODE_OPTIONS} value={artistMode} onChange={onArtistModeChange} />
        </div>

        {/* Filtres — uniquement en mode byFilter */}
        {artistMode === 'byFilter' && (
          <div className={styles.artistFilters}>
            {/* Génération */}
            <FilterBadgeGroupControl
              options={genFilterOptions}
              value={[genFilter]}
              onChange={(v) => onFilterChange({ gen: (v[0] ?? 'all') as GenFilter })}
              single
              size="sm"
            />
            {/* Catégorie */}
            <FilterBadgeGroupControl
              options={catFilterOptions}
              value={[catFilter]}
              onChange={(v) => onFilterChange({ cat: (v[0] ?? 'all') as CatFilter })}
              single
              size="sm"
            />
            {/* Année + Label en ligne */}
            <div className={styles.artistFilterRow}>
              <select
                className={styles.groupFilterSelect}
                value={yearFilter}
                onChange={(e) => onFilterChange({ year: e.target.value })}
              >
                <option value="all">Toutes les années</option>
                {availableYears
                  .filter((y) => y !== 'all')
                  .map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
              </select>
              <select
                className={styles.groupFilterSelect}
                value={labelFilter}
                onChange={(e) => onFilterChange({ label: e.target.value })}
              >
                <option value="all">Tous les labels</option>
                {availableLabels
                  .filter((l) => l !== 'all')
                  .map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Autosuggest — mode Manuel uniquement */}
        {artistMode === 'manual' && (
          <div className={styles.artistAutosuggestRow}>
            <ArtistAutosuggest
              allGroups={allGroups}
              selectedIds={selectedGroupIds}
              onSelect={onAddGroup}
              styles={styles}
            />
          </div>
        )}

        {/* Grille de tuiles */}
        {loading ? (
          <LoadingSpinner label="Chargement…" />
        ) : (
          <>
            {sortedDisplayed.length === 0 ? (
              <p className={styles.artistEmpty}>
                {artistMode === 'byFilter'
                  ? 'Aucun artiste ne correspond à ces filtres.'
                  : 'Aucun artiste sélectionné.'}
              </p>
            ) : (
              <div className={styles.artistGrid}>
                {sortedDisplayed.map((g) => (
                  <ArtistTile
                    key={g.id}
                    group={g}
                    onRemove={artistMode === 'manual' ? () => onRemoveGroup(g.id) : undefined}
                    styles={styles}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Dual-listbox — mode Manuel uniquement (secondaire) */}
        {artistMode === 'manual' && !loading && (
          <>
            <div className={styles.dualListHeader}>
              <span className={styles.dualListTitle}>Sélection avancée</span>
            </div>
            {/* Recherche texte (mode Manuel uniquement) */}
            <div className={styles.groupSearchRow}>
              <input
                className={styles.groupSearch}
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FilterBadgeGroupControl
                options={genFilterOptions}
                value={[genFilter]}
                onChange={(v) => onFilterChange({ gen: (v[0] ?? 'all') as GenFilter })}
                single
                size="sm"
              />
            </div>
            <div className={styles.dual}>
              <div className={styles.listPanel}>
                <div className={styles.listHeader}>Disponibles ({availableForList.length})</div>
                <div className={styles.list}>
                  {availableForList.map((g) => (
                    <GroupRow
                      key={g.id}
                      group={g}
                      selected={selAvail.has(g.id)}
                      onClick={() => toggleAvail(g.id)}
                      onDoubleClick={() => onAddGroup(g.id)}
                      styles={styles}
                      genIcon={genIcon}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.controls}>
                <button className={styles.ctrlBtn} onClick={moveAllRight} title="Tout ajouter">
                  »
                </button>
                <button className={styles.ctrlBtn} onClick={moveRight} title="Ajouter">
                  ›
                </button>
                <button className={styles.ctrlBtn} onClick={moveLeft} title="Retirer">
                  ‹
                </button>
                <button className={styles.ctrlBtn} onClick={moveAllLeft} title="Tout retirer">
                  «
                </button>
              </div>
              <div className={styles.listPanel}>
                <div className={styles.listHeader}>Sélectionnés ({selectedGroups.length})</div>
                <div className={styles.list}>
                  {selectedGroups.map((g) => (
                    <GroupRow
                      key={g.id}
                      group={g}
                      selected={selChosen.has(g.id)}
                      onClick={() => toggleChosen(g.id)}
                      onDoubleClick={() => onRemoveGroup(g.id)}
                      styles={styles}
                      genIcon={genIcon}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </ConfigCard>
    </div>
  )
}

// ─── GroupRow (inchangé) ──────────────────────────────────────────────────────

function GroupRow({
  group,
  selected,
  onClick,
  onDoubleClick,
  styles,
  genIcon,
}: {
  group: Group
  selected: boolean
  onClick: () => void
  onDoubleClick: () => void
  styles: Record<string, string>
  genIcon: (g: Group) => string
}) {
  const isSoloist = group.category === 'femaleSoloist' || group.category === 'maleSoloist'
  return (
    <div
      className={[styles.listItem, selected ? styles.listItemSelected : ''].filter(Boolean).join(' ')}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <span className={styles.listItemName}>{group.name}</span>
      <span className={styles.listItemMeta}>
        {group.parentGroupId && <span className={[styles.rowBadge, styles.rowBadgeSubunit].join(' ')}>SUB</span>}
        {isSoloist && <span className={[styles.rowBadge, styles.rowBadgeSoloist].join(' ')}>SOLO</span>}
        <span className={styles.listItemMetaText}>
          {genIcon(group)} Gen{group.generation}
        </span>
      </span>
    </div>
  )
}
