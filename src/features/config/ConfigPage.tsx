import { useState, useMemo, Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { PageContainer } from '@/shared/Layout'
import { LoadingSpinner } from '@/shared/Components/LoadingSpinner'
import { ToggleControl } from '@/shared/Controls/ToggleControl'
import { FilterBadgeGroupControl } from '@/shared/Controls/FilterBadgeGroupControl'
import { BadgeGroupControl } from '@/shared/Controls/BadgeGroupControl'
import { ConfigCard } from '@/shared/PureComponents/ConfigCard'
import {
  ROLES, ROLE_LABELS, CRITERIA_LABELS,
  GAME_PLAY_MODES, GAME_PLAY_MODE_MAP, TIMER_OPTIONS,
  getAvailableRolesForCriterion, filterRolesForCriterion,
} from '@/shared/constants'
import type {
  Group, QuizMode, QuizCategory,
  SaveOneCriterion, MemberRole, SongType, Generation,
  RoleCriterion,
} from '@/shared/models'
import type { GamePlayMode } from '@/shared/constants'
import styles from './ConfigPage.module.scss'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genIcon(g: Group) {
  return g.category === 'girlGroup' || g.category === 'femaleSoloist' ? '♀' : '♂'
}

const SONG_TYPE_OPTIONS: { value: SongType; label: string }[] = [
  { value: 'all',        label: 'Tous' },
  { value: 'titles',     label: 'Titles' },
  { value: 'bSides',     label: 'B-sides' },
  { value: 'debutSongs', label: 'Debut songs' },
]

const CRITERIA_LIST: SaveOneCriterion[] = [
  'all','beauty','personality','voice','performance','leadership','aegyo','random',
]

type GenFilter = 'all' | Generation
type CatFilter = 'all' | 'girlGroup' | 'boyGroup' | 'femaleSoloist' | 'maleSoloist' | 'subunit'

const CAT_FILTER_OPTIONS: { value: CatFilter; label: string }[] = [
  { value: 'all',           label: 'Toutes les catégories' },
  { value: 'girlGroup',     label: 'Girls groups' },
  { value: 'boyGroup',      label: 'Boys groups' },
  { value: 'femaleSoloist', label: 'Soloist (F)' },
  { value: 'maleSoloist',   label: 'Soloist (M)' },
  { value: 'subunit',       label: 'Sub-unit' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function ConfigPage() {
  const navigate = useNavigate()
  const { config, setConfig, resetConfig } = useGameContext()
  const { data: groups, loading } = useGroupList()

  const isSaveOne  = config.mode === 'saveOne'
  const isIdols    = config.category === 'idols'
  const isSongs    = config.category === 'songs'
  const playMode   = GAME_PLAY_MODE_MAP[config.gamePlayMode]
  const isCustom   = config.gamePlayMode === 'custom'

  // Validation 2 joueurs
  const p1Empty = config.twoPlayerMode && !config.player1Name.trim()
  const p2Empty = config.twoPlayerMode && !config.player2Name.trim()
  const twoPlayerInvalid = config.twoPlayerMode && (p1Empty || p2Empty)

  // ─── Dual-list state ──────────────────────────────────────────────────────
  const [search,    setSearch]    = useState('')
  const [genFilter, setGenFilter] = useState<GenFilter>('all')
  const [catFilter, setCatFilter] = useState<CatFilter>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [labelFilter, setLabelFilter] = useState<string>('all')
  const [selAvail,  setSelAvail]  = useState<Set<string>>(new Set())
  const [selChosen, setSelChosen] = useState<Set<string>>(new Set())

  const allGroups = useMemo(
    () => [...(groups ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  )

  // Valeurs dynamiques des filtres — calculées sur TOUS les groupes
  const availableGens = useMemo<GenFilter[]>(() => {
    const gens = new Set<Generation>(allGroups.map((g) => g.generation as Generation))
    const order: Generation[] = ['1','2','3','4','5']
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

  const genFilterOptions = useMemo(() =>
    availableGens.map((g) => ({
      value: g,
      label: g === 'all' ? 'Toutes gen.' : `Gen ${g}`,
    })), [availableGens])

  const availableGroups = useMemo(
    () => allGroups.filter((g) => !config.selectedGroupIds.includes(g.id)),
    [allGroups, config.selectedGroupIds],
  )

  const selectedGroups = useMemo(
    () => config.selectedGroupIds
      .map((id) => allGroups.find((g) => g.id === id))
      .filter(Boolean) as Group[],
    [allGroups, config.selectedGroupIds],
  )

  const filteredAvailable = useMemo(() => availableGroups.filter((g) => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    if (genFilter !== 'all' && g.generation !== genFilter) return false
    if (catFilter === 'girlGroup'     && g.category !== 'girlGroup') return false
    if (catFilter === 'boyGroup'      && g.category !== 'boyGroup') return false
    if (catFilter === 'femaleSoloist' && g.category !== 'femaleSoloist') return false
    if (catFilter === 'maleSoloist'   && g.category !== 'maleSoloist') return false
    if (catFilter === 'subunit'       && !g.parentGroupId) return false
    if (yearFilter !== 'all' && String(g.debutYear) !== yearFilter) return false
    if (labelFilter !== 'all' && g.company !== labelFilter) return false
    return true
  }), [availableGroups, search, genFilter, catFilter, yearFilter, labelFilter])

  const availableRoles = useMemo(
    () => getAvailableRolesForCriterion(config.criterion, ROLES),
    [config.criterion],
  )

  // Catégories dynamiques — uniquement celles présentes dans le dataset
  const availableCatOptions = useMemo(() => {
    const cats = new Set(allGroups.map((g) => g.category))
    const hasSubunit = allGroups.some((g) => !!g.parentGroupId)
    const base = CAT_FILTER_OPTIONS.filter(
      (o) => o.value === 'all' || cats.has(o.value as Group['category']) || (o.value === 'subunit' && hasSubunit),
    )
    return base
  }, [allGroups])
  function handlePlayModeChange(mode: GamePlayMode) {
    const preset = GAME_PLAY_MODE_MAP[mode]
    setConfig({ gamePlayMode: mode, timerSeconds: preset.timerDefault, clipDuration: preset.clipDefault })
  }

  function handleTwoPlayerToggle(v: boolean) {
    const patch: Partial<typeof config> = { twoPlayerMode: v }
    // Pré-remplir les pseudos par défaut si vides
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

  // ─── Transfer ─────────────────────────────────────────────────────────────
  function moveRight()    { setConfig({ selectedGroupIds: [...config.selectedGroupIds, ...[...selAvail].filter(id => !config.selectedGroupIds.includes(id))] }); setSelAvail(new Set()) }
  function moveAllRight() { setConfig({ selectedGroupIds: [...new Set([...config.selectedGroupIds, ...filteredAvailable.map(g => g.id)])] }); setSelAvail(new Set()) }
  function moveLeft()     { setConfig({ selectedGroupIds: config.selectedGroupIds.filter(id => ![...selChosen].includes(id)) }); setSelChosen(new Set()) }
  function moveAllLeft()  { setConfig({ selectedGroupIds: [] }); setSelChosen(new Set()) }
  function toggleAvail(id: string)  { setSelAvail(prev  => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleChosen(id: string) { setSelChosen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  const canLaunch = !twoPlayerInvalid && !(isCustom && config.selectedGroupIds.length === 0)

  function launch() {
    if (!canLaunch) return
    navigate(config.mode === 'blindTest' ? '/game/blind-test' : '/game/save-one')
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Configuration</h1>
        <div className={styles.pageHeaderActions}>
          <button className="btn btn--primary" style={{ minWidth: 160 }} onClick={launch} disabled={!canLaunch}>
            ▶ Lancer la partie
          </button>
          <button className="btn btn--secondary" style={{ minWidth: 160 }} onClick={resetConfig}>
            Reset config
          </button>
        </div>
      </div>

      {/* ══ SECTION CHOIX DU JEU ══ */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Choix du jeu</p>
        <ConfigCard>
          <div className={styles.fieldsRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Type de quiz</span>
              <select className="select" value={config.mode}
                onChange={(e) => setConfig({ mode: e.target.value as QuizMode })}>
                <option value="saveOne">Save One</option>
                <option value="blindTest">Blind Test</option>
                <option value="tournament" disabled>Tournoi — bientôt disponible</option>
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Catégorie</span>
              <select className="select" value={config.category}
                onChange={(e) => setConfig({ category: e.target.value as QuizCategory })}>
                <option value="idols">Idoles</option>
                <option value="songs">Chansons</option>
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Mode de jeu</span>
              <select className="select" value={config.gamePlayMode}
                onChange={(e) => handlePlayModeChange(e.target.value as GamePlayMode)}>
                {GAME_PLAY_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </ConfigCard>
      </div>

      {/* ══ SECTION OPTIONS DE LA PARTIE ══ */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Options de la partie</p>

        {/* Bloc paramètres numériques */}
        <ConfigCard>
          <div className={styles.fieldsRow}>
            {isSaveOne && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Drops (1–4)</span>
                <input type="number" className="input" min={1} max={4} value={config.drops}
                  onChange={(e) => setConfig({ drops: Math.max(1, Math.min(4, parseInt(e.target.value) || 1)) })} />
                <span className={styles.fieldHint}>{config.drops + 1} choix par round</span>
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Rounds (1–20)</span>
              <input type="number" className="input" min={1} max={20} value={config.rounds}
                onChange={(e) => setConfig({ rounds: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })} />
            </div>
            <div className={[styles.field, !playMode.timerEditable ? styles.fieldDisabled : ''].filter(Boolean).join(' ')}>
              <span className={styles.fieldLabel}>Timer</span>
              <select className="select"
                value={playMode.timerEditable ? config.timerSeconds : playMode.timerDefault}
                disabled={!playMode.timerEditable}
                onChange={(e) => setConfig({ timerSeconds: parseInt(e.target.value) })}>
                {TIMER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {!playMode.timerEditable && <span className={styles.fieldHint}>Fixé par le mode de jeu.</span>}
            </div>
            {isSongs && (
              <div className={[styles.field, !playMode.clipEditable ? styles.fieldDisabled : ''].filter(Boolean).join(' ')}>
                <span className={styles.fieldLabel}>Durée des extraits (1–15s)</span>
                <input type="number" className="input" min={1} max={15}
                  value={playMode.clipEditable ? config.clipDuration : playMode.clipDefault}
                  disabled={!playMode.clipEditable}
                  onChange={(e) => setConfig({ clipDuration: Math.max(1, Math.min(15, parseInt(e.target.value) || 5)) })} />
                {!playMode.clipEditable && <span className={styles.fieldHint}>Fixé par le mode de jeu.</span>}
              </div>
            )}
          </div>
        </ConfigCard>

        {/* Bloc mode 2 joueurs */}
        <div style={{ marginTop: 10 }}>
          <ConfigCard>
            <div className={styles.twoPlayerRow}>
              <div className={styles.twoPlayerLeft}>
                <ToggleControl checked={config.twoPlayerMode}
                  onChange={handleTwoPlayerToggle}
                  label="Mode 2 joueurs" />
                <span className={styles.twoPlayerDesc}>
                  Permet à deux joueurs de répondre chacun leur tour lors d'une partie.
                </span>
              </div>
              <div className={styles.twoPlayerFields}>
                <div className={styles.twoPlayerField}>
                  <span className={styles.fieldLabel}>Joueur 1</span>
                  <input className="input" value={config.player1Name} placeholder="Joueur 1"
                    disabled={!config.twoPlayerMode}
                    onChange={(e) => setConfig({ player1Name: e.target.value })} />
                  {p1Empty && <span className={styles.fieldError}>Pseudo requis</span>}
                </div>
                <div className={styles.twoPlayerField}>
                  <span className={styles.fieldLabel}>Joueur 2</span>
                  <input className="input" value={config.player2Name} placeholder="Joueur 2"
                    disabled={!config.twoPlayerMode}
                    onChange={(e) => setConfig({ player2Name: e.target.value })} />
                  {p2Empty && <span className={styles.fieldError}>Pseudo requis</span>}
                </div>
              </div>
            </div>
          </ConfigCard>
        </div>
      </div>

      {isCustom && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Options supplémentaires</p>

          {/* Carte options (critère/rôles OU type chansons) */}
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
                 <span className={styles.fieldLabel}>Rôles (plusieurs sélections possible)</span>
                      <BadgeGroupControl<RoleCriterion>           
                        options={[
                          { value: 'all', label: 'Tous' },
                          ...availableRoles.map((r) => ({ value: r as RoleCriterion, label: ROLE_LABELS[r] })),
                        ]}
                        value={config.roleFilters.length === 0 ? ['all'] : config.roleFilters as (RoleCriterion)[]}
                        onChange={(vals) => {
    
                          // "Tous" vient d'être sélectionné après configuration des rôles → reset
                          if (vals.includes('all') && config.roleFilters.length > 0) {
                            setConfig({ roleFilters: [] })
                          } else {
                            const newVals = vals.filter(v => v != 'all') as MemberRole[]
                            setConfig({ roleFilters: newVals })
                          }
                        }}
                        isMultiselect
                        size="sm"
                      />
                    </div>
                  </>
                )}
                {isSongs && (
                  <div className={styles.optionGroup}>
                  <span className={styles.fieldLabel}>Type de chansons</span>
                    <BadgeGroupControl<SongType>
                      options={SONG_TYPE_OPTIONS}
                      value={[config.songType]}
                      onChange={(v) => setConfig({ songType: v[0] ?? 'all' })}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </ConfigCard>
          )}

          {/* Carte Groupes — sœur de la carte options */}
          <GroupSelector
            allGroups={allGroups}
            selectedGroupIds={config.selectedGroupIds}
            filteredAvailable={filteredAvailable}
            selectedGroups={selectedGroups}
            selAvail={selAvail}
            selChosen={selChosen}
            search={search} setSearch={setSearch}
            genFilter={genFilter} setGenFilter={setGenFilter}
            catFilter={catFilter} setCatFilter={setCatFilter}
            yearFilter={yearFilter} setYearFilter={setYearFilter}
            labelFilter={labelFilter} setLabelFilter={setLabelFilter}
            genFilterOptions={genFilterOptions}
            catFilterOptions={availableCatOptions}
            availableYears={availableYears}
            availableLabels={availableLabels}
            toggleAvail={toggleAvail} toggleChosen={toggleChosen}
            moveRight={moveRight} moveAllRight={moveAllRight}
            moveLeft={moveLeft} moveAllLeft={moveAllLeft}
            setConfig={setConfig}
            loading={loading}
            styles={styles}
          />
        </div>
      )}
    </PageContainer>
  )
}

interface GroupSelectorProps {
  allGroups: Group[]
  selectedGroupIds: string[]
  filteredAvailable: Group[]
  selectedGroups: Group[]
  selAvail: Set<string>
  selChosen: Set<string>
  search: string; setSearch: (v: string) => void
  genFilter: string; setGenFilter: Dispatch<SetStateAction<GenFilter>>
  catFilter: string; setCatFilter: Dispatch<SetStateAction<CatFilter>>
  yearFilter: string; setYearFilter: (v: string) => void
  labelFilter: string; setLabelFilter: (v: string) => void
  genFilterOptions: { value: string; label: string }[]
  catFilterOptions: { value: string; label: string }[]
  availableYears: string[]
  availableLabels: string[]
  toggleAvail: (id: string) => void
  toggleChosen: (id: string) => void
  moveRight: () => void; moveAllRight: () => void
  moveLeft: () => void; moveAllLeft: () => void
  setConfig: (patch: object) => void
  loading: boolean
  styles: Record<string, string>
}

function GroupSelector({
  selectedGroupIds, filteredAvailable, selectedGroups,
  selAvail, selChosen, search, setSearch,
  genFilter, setGenFilter, catFilter, setCatFilter,
  yearFilter, setYearFilter, labelFilter, setLabelFilter,
  genFilterOptions, catFilterOptions, availableYears, availableLabels,
  toggleAvail, toggleChosen, moveRight, moveAllRight, moveLeft, moveAllLeft,
  setConfig, loading, styles,
}: GroupSelectorProps) {
  return (
    <ConfigCard>
      <div className={styles.groupSelectorHeader}>
        <span className={styles.groupSelectorTitle}>Groupes</span>
        {selectedGroupIds.length > 0 && (
          <span className={styles.groupSelectorCount}>
            — {selectedGroupIds.length} sélectionné{selectedGroupIds.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Ligne recherche + filtres select */}
      <div className={styles.groupSearchRow}>
        <input className={styles.groupSearch} placeholder="Rechercher..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.groupFilterSelect} value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}>
          <option value="all">Toutes les années</option>
          {availableYears.filter(y => y !== 'all').map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className={styles.groupFilterSelect} value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value)}>
          <option value="all">Tous les labels</option>
          {availableLabels.filter(l => l !== 'all').map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Filtres Gen dynamiques */}
      <div className={styles.groupFilters}>
        <FilterBadgeGroupControl
          options={genFilterOptions}
          value={[genFilter]}
          onChange={(v) => setGenFilter((v[0] ?? 'all') as GenFilter)}
          single size="sm" />
      </div>

      {/* Filtres Catégorie dynamiques */}
      <div className={styles.groupFilters}>
        <FilterBadgeGroupControl
          options={catFilterOptions}
          value={[catFilter]}
          onChange={(v) => setCatFilter((v[0] ?? 'all') as CatFilter)}
          single size="sm" />
      </div>

      {loading ? <LoadingSpinner label="Chargement…" /> : (
        <div className={styles.dual}>
          <div className={styles.listPanel}>
            <div className={styles.listHeader}>Disponibles ({filteredAvailable.length})</div>
            <div className={styles.list}>
              {filteredAvailable.map((g) => (
                <GroupRow key={g.id} group={g} selected={selAvail.has(g.id)}
                  onClick={() => toggleAvail(g.id)}
                  onDoubleClick={() => setConfig({ selectedGroupIds: [...selectedGroupIds, g.id] })}
                  styles={styles} genIcon={genIcon} />
              ))}
            </div>
          </div>
          <div className={styles.controls}>
            <button className={styles.ctrlBtn} onClick={moveAllRight} title="Tout ajouter">»</button>
            <button className={styles.ctrlBtn} onClick={moveRight} title="Ajouter">›</button>
            <button className={styles.ctrlBtn} onClick={moveLeft} title="Retirer">‹</button>
            <button className={styles.ctrlBtn} onClick={moveAllLeft} title="Tout retirer">«</button>
          </div>
          <div className={styles.listPanel}>
            <div className={styles.listHeader}>Sélectionnés ({selectedGroups.length})</div>
            <div className={styles.list}>
              {selectedGroups.map((g) => (
                <GroupRow key={g.id} group={g} selected={selChosen.has(g.id)}
                  onClick={() => toggleChosen(g.id)}
                  onDoubleClick={() => setConfig({ selectedGroupIds: selectedGroupIds.filter(id => id !== g.id) })}
                  styles={styles} genIcon={genIcon} />
              ))}
            </div>
          </div>
        </div>
      )}
    </ConfigCard>
  )
}

// ─── GroupRow ─────────────────────────────────────────────────────────────────
function GroupRow({ group, selected, onClick, onDoubleClick, styles, genIcon }: {
  group: Group; selected: boolean
  onClick: () => void; onDoubleClick: () => void
  styles: Record<string, string>; genIcon: (g: Group) => string
}) {
  const isSoloist = group.category === 'femaleSoloist' || group.category === 'maleSoloist'
  return (
    <div className={[styles.listItem, selected ? styles.listItemSelected : ''].filter(Boolean).join(' ')}
      onClick={onClick} onDoubleClick={onDoubleClick}>
      <span className={styles.listItemName}>{group.name}</span>
      <span className={styles.listItemMeta}>
        {group.parentGroupId && <span className={[styles.rowBadge, styles.rowBadgeSubunit].join(' ')}>SUB</span>}
        {isSoloist           && <span className={[styles.rowBadge, styles.rowBadgeSoloist].join(' ')}>SOLO</span>}
        <span className={styles.listItemMetaText}>{genIcon(group)} Gen{group.generation}</span>
      </span>
    </div>
  )
}
