import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { PageContainer } from '@/shared/Layout'
import { ToggleControl } from '@/shared/Controls/ToggleControl'
import { BadgeGroupControl } from '@/shared/Controls/BadgeGroupControl'
import { SegmentedControl } from '@/shared/Controls/SegmentedControl'
import { SliderControl } from '@/shared/Controls/SliderControl'
import { SelectControl } from '@/shared/Controls/SelectControl'
import { ConfigCard } from '@/shared/PureComponents/ConfigCard'
import { ArtistSelector } from '@/shared/Components/ArtistSelector'
import type { ArtistFilterState } from '@/shared/Components/ArtistSelector'
import {
  ALL_OPTION_VALUE,
  ROLES,
  ROLE_LABELS,
  CRITERIA,
  CRITERIA_LABELS,
  LANGUAGE_OPTIONS,
  GAME_PLAY_MODES,
  GAME_PLAY_MODE_MAP,
  SONG_TYPE_OPTIONS,
  getAvailableRolesForCriterion,
  filterRolesForCriterion,
  DROPS_OPTIONS,
  QUIZ_TYPES_OPTIONS,
  QUIZ_CATEGORIES_OPTIONS,
} from '@/shared/constants'
import type {
  Group,
  GroupCategory,
  SaveOneCriterion,
  MemberRole,
  SongType,
  LanguageOption,
  GameConfig,
  GamePlayMode,
} from '@/shared/models'
import { useConfigPreparation, type PreparationStatus } from '@/shared/hooks/useConfigPreparation'
import type { MaxRoundsResult } from '@/features/save-one/helpers/poolScopeRules'
import styles from './ConfigPage.module.scss'

// ─── Constantes locales ───────────────────────────────────────────────────────

const CAT_OPTIONS: { value: GroupCategory | 'subunit'; label: string }[] = [
  { value: 'girlGroup', label: 'Girls groups' },
  { value: 'boyGroup', label: 'Boys groups' },
  { value: 'femaleSoloist', label: 'Soloist (F)' },
  { value: 'maleSoloist', label: 'Soloist (M)' },
  { value: 'subunit', label: 'Sub-unit' },
]

const GAME_ROUTES: Record<string, string> = {
  saveOne: '/game/save-one',
  blindTest: '/game/blind-test',
  quickVote: '/game/quick-vote',
}

// ─── Helpers filtrage artistes ────────────────────────────────────────────────

function groupMatchesFilter(
  g: Group,
  filters: { gens: string[]; cats: string[]; year: string; label: string },
): boolean {
  if (filters.gens.length > 0 && !filters.gens.includes(g.generation ?? '')) return false
  if (filters.cats.length > 0) {
    const matchesCat = filters.cats.some((c) => c !== 'subunit' && c === g.category)
    const matchesSubunit = filters.cats.includes('subunit') && !!g.parentGroupId
    if (!matchesCat && !matchesSubunit) return false
  }
  if (filters.year !== ALL_OPTION_VALUE && String(g.debutYear) !== filters.year) return false
  if (filters.label !== ALL_OPTION_VALUE && g.company !== filters.label) return false
  return true
}

function applyGroupFilters(
  groups: Group[],
  filters: { gens: string[]; cats: string[]; year: string; label: string },
): Group[] {
  return groups.filter((g) => groupMatchesFilter(g, filters))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const navigate = useNavigate()
  const { config, setConfig, resetConfig } = useGameContext()
  const { data: groups, loading } = useGroupList()

  // ── Modes dérivés ─────────────────────────────────────────────────────────

  const isSaveOne = config.mode === 'saveOne'
  const isIdols = config.category === 'idols'
  const isSongs = config.category === 'songs'
  const playMode = GAME_PLAY_MODE_MAP[config.gamePlayMode]
  const isCustom = config.gamePlayMode === 'custom'

  // ── Sélection artistes ────────────────────────────────────────────────────

  const [artistMode, setArtistMode] = useState<'all' | 'byFilter' | 'manual'>(() =>
    config.selectedGroupIds.length === 0 ? 'all' : 'manual',
  )

  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>(config.selectedGroupIds)

  const [artistFilters, setArtistFilters] = useState<ArtistFilterState>({
    gens: [],
    cats: [],
    year: ALL_OPTION_VALUE,
    label: ALL_OPTION_VALUE,
  })

  const allGroups = useMemo(() => [...(groups ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [groups])

  const byFilterGroups = useMemo(() => applyGroupFilters(allGroups, artistFilters), [allGroups, artistFilters])

  useEffect(() => {
    if (artistMode === 'all') setConfig({ selectedGroupIds: [] })
    else if (artistMode === 'byFilter') setConfig({ selectedGroupIds: byFilterGroups.map((g) => g.id) })
    else setConfig({ selectedGroupIds: manualSelectedIds })
  }, [artistMode, byFilterGroups, manualSelectedIds])

  // ── Préparation (mode Personnalisé) ───────────────────────────────────────

  const {
    status: prepStatus,
    result: prepResult,
    errorMessage: prepError,
    prepare,
  } = useConfigPreparation(config, setConfig)

  const canLaunch = prepStatus === 'valid' || prepStatus === 'adjusted'

  const p1Empty = config.twoPlayerMode && !config.player1Name.trim()
  const p2Empty = config.twoPlayerMode && !config.player2Name.trim()
  const twoPlayerInvalid = config.twoPlayerMode && (p1Empty || p2Empty)

  const [roundsClampedMax, setRoundsClampedMax] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (prepStatus === 'adjusted' && prepResult) {
      setRoundsClampedMax(prepResult.maxRounds)
    } else if (['loading', 'valid', 'invalid'].includes(prepStatus)) {
      setRoundsClampedMax(undefined)
    }
  }, [prepStatus, prepResult])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePlayModeChange(mode: GamePlayMode) {
    const m = GAME_PLAY_MODE_MAP[mode]
    setConfig({ gamePlayMode: mode, timerSeconds: m.timerDefault, clipDuration: m.clipDefault })
  }

  function handleCriterionChange(criterion: SaveOneCriterion) {
    setConfig({ criterion, roleFilters: filterRolesForCriterion(config.roleFilters, criterion, ROLES) })
  }

  const availableRoles = useMemo(() => getAvailableRolesForCriterion(config.criterion, ROLES), [config.criterion])

  const genFilterOptions = useMemo(() => {
    const gens = new Set(allGroups.map((g) => g.generation).filter(Boolean))
    return [...gens].sort().map((gen) => ({ value: gen as string, label: `Gen ${gen}` }))
  }, [allGroups])

  /**
   * Années disponibles = années présentes dans les groupes passant
   * [gens, cats, label] — tous les filtres SAUF year.
   */
  const availableYears = useMemo(() => {
    const partial = { gens: artistFilters.gens, cats: artistFilters.cats, year: 'all', label: artistFilters.label }
    const years = new Set<string>()
    for (const g of allGroups) {
      if (groupMatchesFilter(g, partial) && g.debutYear) years.add(String(g.debutYear))
    }
    return [...years].sort()
  }, [allGroups, artistFilters.gens, artistFilters.cats, artistFilters.label])

  /**
   * Labels disponibles = labels présents dans les groupes passant
   * [gens, cats, year] — tous les filtres SAUF label.
   */
  const availableLabels = useMemo(() => {
    const partial = { gens: artistFilters.gens, cats: artistFilters.cats, year: artistFilters.year, label: 'all' }
    const labels = new Set<string>()
    for (const g of allGroups) {
      if (groupMatchesFilter(g, partial) && g.company) labels.add(g.company)
    }
    return [...labels].sort()
  }, [allGroups, artistFilters.gens, artistFilters.cats, artistFilters.year])

  // const availableYears = useMemo(() => {
  //   const years = new Set(allGroups.map((g) => String(g.debutYear)))
  //   return [...years].sort((a, b) => Number(b) - Number(a))
  // }, [allGroups])

  // const availableLabels = useMemo(() => {
  //   const labels = new Set(allGroups.map((g) => g.company).filter(Boolean))
  //   return [...labels].sort()
  // }, [allGroups])

  const catFilterOptions = CAT_OPTIONS as { value: string; label: string }[]

  // Valeur timer affichée : si le mode fixe le timer, utiliser sa valeur par défaut
  const timerValue = playMode.timerEditable ? config.timerSeconds : playMode.timerDefault

  function launch() {
    const route = GAME_ROUTES[config.mode]
    if (route) navigate(route)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      {/* ══ En-tête ══ */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Configuration</h1>
        <div className={styles.pageHeaderActions}>
          <button className="btn btn--secondary btn--md" onClick={resetConfig}>
            Reset config
          </button>
          {!canLaunch ? (
            <button
              className="btn btn--primary"
              onClick={prepare}
              disabled={prepStatus === 'loading' || twoPlayerInvalid}
              style={{ minWidth: 180 }}
            >
              {prepStatus === 'loading' ? '⏳ Vérification…' : '🔍 Préparer la partie'}
            </button>
          ) : (
            <button className="btn btn--primary" onClick={launch} style={{ minWidth: 180 }}>
              ▶ Lancer la partie
            </button>
          )}
        </div>
      </div>

      {/* Bandeau de préparation (mode Personnalisé uniquement) */}
      {isCustom && <PrepBanner status={prepStatus} result={prepResult} errorMessage={prepError} styles={styles} />}

      {/* ══ Choix du jeu ══ */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Choix du jeu</p>
        <ConfigCard>
          <div className={styles.fieldsRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Type de quiz</span>
              <SelectControl
                value={config.mode}
                onChange={(v) => setConfig({ mode: v as GameConfig['mode'] })}
                options={QUIZ_TYPES_OPTIONS}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Catégorie</span>
              <SelectControl
                value={config.category}
                onChange={(v) => setConfig({ category: v as GameConfig['category'] })}
                options={QUIZ_CATEGORIES_OPTIONS}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Mode de jeu</span>
              <SelectControl
                value={config.gamePlayMode}
                onChange={(v) => handlePlayModeChange(v as GamePlayMode)}
                options={GAME_PLAY_MODES.map((m) => ({ value: m.value, label: m.label }))}
              />
            </div>
          </div>
        </ConfigCard>
      </div>

      {/* ══ Options de la partie ══ */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Options de la partie</p>
        <ConfigCard>
          <div className={styles.optionsTopRow}>
            {/* Drops (Save One uniquement) — SegmentedControl compact */}
            {isSaveOne && (
              <div className={styles.optionsCompact}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Drops</span>
                  <SegmentedControl
                    value={config.drops.toString()}
                    options={DROPS_OPTIONS}
                    onChange={(v) => setConfig({ drops: parseInt(v) })}
                  />
                </div>
              </div>
            )}

            {/* Rounds + Timer + Durée extraits — SliderControls */}
            <div className={styles.optionsSliders}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Rounds</span>
                <SliderControl
                  value={config.rounds}
                  onChange={(v) => setConfig({ rounds: v })}
                  min={2}
                  max={20}
                  clampedMax={roundsClampedMax}
                  onClampReset={() => {}}
                />
              </div>

              {/* Timer — slider 0–30s (step 5). 0 = Aucun. */}
              <div
                className={[styles.field, !playMode.timerEditable ? styles.fieldDisabled : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={styles.fieldLabel}>Timer</span>
                <SliderControl
                  value={timerValue}
                  onChange={(v) => setConfig({ timerSeconds: v })}
                  min={0}
                  max={30}
                  step={5}
                  labelValue={timerValue === 0 ? 'Aucun' : undefined}
                  suffixValue={timerValue > 0 ? 's' : ''}
                  disabled={!playMode.timerEditable}
                />
                {!playMode.timerEditable && <span className={styles.fieldHint}>Fixé par le mode de jeu.</span>}
              </div>

              {isSongs && (
                <div
                  className={[styles.field, !playMode.clipEditable ? styles.fieldDisabled : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className={styles.fieldLabel}>Durée extraits</span>
                  <SliderControl
                    value={playMode.clipEditable ? config.clipDuration : playMode.clipDefault}
                    onChange={(v) => setConfig({ clipDuration: v })}
                    min={1}
                    max={15}
                    suffixValue={'s'}
                    disabled={!playMode.clipEditable}
                  />
                  {!playMode.clipEditable && <span className={styles.fieldHint}>Fixé par le mode de jeu.</span>}
                </div>
              )}
            </div>
          </div>

          {/* Ligne 2 : mode 2 joueurs */}
          <div className={styles.twoPlayerRow}>
            <div className={styles.twoPlayerLeft}>
              <span className={styles.fieldLabel}>Mode 2 joueurs</span>
              <ToggleControl checked={config.twoPlayerMode} onChange={(v) => setConfig({ twoPlayerMode: v })} />
              <span className={styles.twoPlayerDesc}>Permet à deux joueurs de répondre chacun leur tour.</span>
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

      {/* ══ Options supplémentaires + Sélection artistes (mode Personnalisé) ══ */}
      {isCustom && (
        <>
          {(isIdols || isSongs) && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>Options supplémentaires</p>

              <ConfigCard>
                <div className={styles.advancedSection}>
                  {isIdols && (
                    <>
                      <div className={styles.optionGroup}>
                        <span className={styles.fieldLabel}>Critère</span>
                        <BadgeGroupControl<SaveOneCriterion>
                          options={CRITERIA.map((c) => ({ value: c, label: CRITERIA_LABELS[c] }))}
                          allOptionLabel="Tous"
                          value={config.criterion === ALL_OPTION_VALUE ? [] : [config.criterion]}
                          onChange={(v) => handleCriterionChange((v[0] as SaveOneCriterion) ?? ALL_OPTION_VALUE)}
                          size="sm"
                        />
                      </div>
                      <div className={styles.optionGroup}>
                        <span className={styles.fieldLabel}>Rôles</span>
                        <BadgeGroupControl<MemberRole>
                          options={availableRoles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                          allOptionLabel="Tous"
                          value={config.roleFilters}
                          onChange={(v) => setConfig({ roleFilters: v as MemberRole[] })}
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
                          options={SONG_TYPE_OPTIONS as { value: SongType; label: string }[]}
                          allOptionLabel="Tous"
                          value={config.songType === ALL_OPTION_VALUE ? [] : [config.songType]}
                          onChange={(v) => setConfig({ songType: (v[0] as SongType) ?? ALL_OPTION_VALUE })}
                          size="sm"
                        />
                      </div>
                      <div className={styles.optionGroup}>
                        <span className={styles.fieldLabel}>Langue</span>
                        <BadgeGroupControl<LanguageOption>
                          options={LANGUAGE_OPTIONS as { value: LanguageOption; label: string }[]}
                          allOptionLabel="Toutes"
                          value={config.songLanguage === ALL_OPTION_VALUE ? [] : [config.songLanguage]}
                          onChange={(v) => setConfig({ songLanguage: (v[0] as LanguageOption) ?? ALL_OPTION_VALUE })}
                          size="sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              </ConfigCard>
            </div>
          )}

          <div className={styles.section}>
            <p className={styles.sectionTitle}>Sélection des artistes</p>
            <ArtistSelector
              artistMode={artistMode}
              onArtistModeChange={(m) => setArtistMode(m as 'all' | 'byFilter' | 'manual')}
              manualSelectedIds={manualSelectedIds}
              onManualSelectionChange={setManualSelectedIds}
              allGroups={allGroups}
              loading={loading}
              filters={artistFilters}
              onFilterChange={(u) => setArtistFilters((prev) => ({ ...prev, ...u }))}
              byFilterGroups={byFilterGroups}
              genOptions={genFilterOptions}
              catOptions={catFilterOptions}
              availableYears={availableYears}
              availableLabels={availableLabels}
            />
          </div>
        </>
      )}
    </PageContainer>
  )
}

// ─── PrepBanner ───────────────────────────────────────────────────────────────

function PrepBanner({
  status,
  result,
  errorMessage,
  styles,
}: {
  status: PreparationStatus
  result: MaxRoundsResult | null
  errorMessage: string | null
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
            {result.clampMessage && <span className={styles.prepBannerText}>{result.clampMessage}</span>}
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
          <span className={styles.prepBannerText}>Config validée. Vous pouvez lancer la partie.</span>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className={styles.prepBannerWrap}>
        <div className={[styles.prepBanner, styles.prepBannerError].join(' ')}>
          <span className={styles.prepBannerIcon}>✕</span>
          <span className={styles.prepBannerText}>{errorMessage ?? 'Une erreur est survenue.'}</span>
        </div>
      </div>
    )
  }

  return null
}
