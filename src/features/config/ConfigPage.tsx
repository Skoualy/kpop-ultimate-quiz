import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { PageContainer } from '@/shared/Layout'
import { ToggleControl } from '@/shared/Controls/ToggleControl'
import { BadgeGroupControl } from '@/shared/Controls/BadgeGroupControl'
import { SegmentedControl } from '@/shared/Controls/SegmentedControl'
import { SliderControl } from '@/shared/Controls/SliderControl'
import { ConfigCard } from '@/shared/PureComponents/ConfigCard'
import { ArtistSelector } from '@/shared/Components/ArtistSelector'
import type { ArtistFilterState } from '@/shared/Components/ArtistSelector'
import {
  ROLES,
  ROLE_LABELS,
  CRITERIA_LABELS,
  GAME_PLAY_MODES,
  GAME_PLAY_MODE_MAP,
  TIMER_OPTIONS,
  getAvailableRolesForCriterion,
  filterRolesForCriterion,
  DROPS_OPTIONS,
  QUIZ_TYPES_OPTIONS,
  QUIZ_CATEGORIES_OPTIONS,
} from '@/shared/constants'
import type {
  Group,
  SaveOneCriterion,
  MemberRole,
  SongType,
  Generation,
  RoleCriterion,
  GameConfig,
  LanguageOption,
} from '@/shared/models'
import { useConfigPreparation, type PreparationStatus } from '@/shared/hooks/useConfigPreparation'
import type { MaxRoundsResult } from '@/features/save-one/helpers/poolScopeRules'
import type { GamePlayMode } from '@/shared/constants'
import styles from './ConfigPage.module.scss'
import { ConfigPageServices } from './ConfigPage.services'
import { SelectControl } from '@/shared/Controls/SelectControl'

// ─── Types ────────────────────────────────────────────────────────────────────

type CatValue = 'all' | 'girlGroup' | 'boyGroup' | 'femaleSoloist' | 'maleSoloist' | 'subunit'

// ─── Constantes ───────────────────────────────────────────────────────────────

const defaultOptionValue = 'all'

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

/** Catégories disponibles sans l'option 'all' — on est en multi-select */
const CAT_OPTIONS: { value: CatValue; label: string }[] = [
  { value: 'girlGroup', label: 'Girls groups' },
  { value: 'boyGroup', label: 'Boys groups' },
  { value: 'femaleSoloist', label: 'Soloist (F)' },
  { value: 'maleSoloist', label: 'Soloist (M)' },
  { value: 'subunit', label: 'Sub-unit' },
]

const songLanguageOptions = ConfigPageServices.buildSongLanguageOptions()

const GAME_ROUTES: Record<string, string> = {
  saveOne: '/game/save-one',
  blindTest: '/game/blind-test',
  quickVote: '/game/quick-vote',
}

// ─── Helpers de filtrage ──────────────────────────────────────────────────────

/**
 * Vérifie si un groupe passe les filtres gens + cats + year + label.
 * - gens vide = toutes générations
 * - cats vide = toutes catégories
 * - 'subunit' dans cats = groups with parentGroupId
 */
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

  if (filters.year !== 'all' && String(g.debutYear) !== filters.year) return false
  if (filters.label !== 'all' && g.company !== filters.label) return false
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

  // ── Mode sélection artistes ───────────────────────────────────────────────

  const [artistMode, setArtistMode] = useState<'all' | 'byFilter' | 'manual'>(() =>
    config.selectedGroupIds.length === 0 ? 'all' : 'manual',
  )

  // Sélection manuelle conservée indépendamment du mode actif
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>(config.selectedGroupIds)

  // ── Filtres artistes — gens et cats sont des tableaux (multi-select) ──────

  const [artistFilters, setArtistFilters] = useState<ArtistFilterState>({
    gens: [], // [] = toutes génération
    cats: [], // [] = toutes catégories
    year: 'all',
    label: 'all',
  })

  // ── Préparation ───────────────────────────────────────────────────────────

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

  /**
   * FIX slider Rounds : clamp géré en état local pour persister même quand
   * prepStatus retourne à 'idle' suite à un changement de rounds.
   *
   * Règle :
   * - 'adjusted' → mémoriser le clamp
   * - 'loading' | 'valid' | 'invalid' → effacer le clamp (nouvelle validation)
   * - 'idle' → ne pas toucher (peut venir d'un simple changement de rounds)
   */
  const [roundsClampedMax, setRoundsClampedMax] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (prepStatus === 'adjusted' && prepResult) {
      setRoundsClampedMax(prepResult.maxRounds)
    } else if (prepStatus === 'loading' || prepStatus === 'valid' || prepStatus === 'invalid') {
      setRoundsClampedMax(undefined)
    }
    // 'idle' → ne pas toucher
  }, [prepStatus, prepResult])

  // ── Validation 2 joueurs ──────────────────────────────────────────────────

  const p1Empty = config.twoPlayerMode && !config.player1Name.trim()
  const p2Empty = config.twoPlayerMode && !config.player2Name.trim()
  const twoPlayerInvalid = config.twoPlayerMode && (p1Empty || p2Empty)

  // ── Groupes de base ───────────────────────────────────────────────────────

  const allGroups = useMemo(() => [...(groups ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [groups])

  // ── Groupes filtrés ───────────────────────────────────────────────────────

  const byFilterGroups = useMemo(() => applyGroupFilters(allGroups, artistFilters), [allGroups, artistFilters])

  // ── Options intelligentes — chaque filtre est recalculé sans lui-même ─────

  /**
   * Générations disponibles = gens présentes dans les groupes passant
   * [cats, year, label] — tous les filtres SAUF gens.
   */
  const genFilterOptions = useMemo(() => {
    const partial = { gens: [], cats: artistFilters.cats, year: artistFilters.year, label: artistFilters.label }
    const gens = new Set<string>()
    for (const g of allGroups) {
      if (groupMatchesFilter(g, partial) && g.generation) gens.add(g.generation)
    }
    const order: Generation[] = ['1', '2', '3', '4', '5']
    return order.filter((gen) => gens.has(gen)).map((gen) => ({ value: gen, label: `Gen ${gen}` }))
  }, [allGroups, artistFilters.cats, artistFilters.year, artistFilters.label])

  /**
   * Catégories disponibles = cats présentes dans les groupes passant
   * [gens, year, label] — tous les filtres SAUF cats.
   */
  const catFilterOptions = useMemo(() => {
    const partial = { gens: artistFilters.gens, cats: [], year: artistFilters.year, label: artistFilters.label }
    const catSet = new Set<string>()
    let hasSubunit = false
    for (const g of allGroups) {
      if (!groupMatchesFilter(g, partial)) continue
      catSet.add(g.category)
      if (g.parentGroupId) hasSubunit = true
    }
    return CAT_OPTIONS.filter((o) => {
      if (o.value === 'subunit') return hasSubunit
      return catSet.has(o.value)
    })
  }, [allGroups, artistFilters.gens, artistFilters.year, artistFilters.label])

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

  const availableRoles = useMemo(() => getAvailableRolesForCriterion(config.criterion, ROLES), [config.criterion])

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    setConfig({ criterion, roleFilters: filterRolesForCriterion(config.roleFilters, criterion, ROLES) })
  }

  function handleArtistModeChange(mode: 'all' | 'byFilter' | 'manual') {
    setArtistMode(mode)
    if (mode === 'all') {
      setConfig({ selectedGroupIds: [] })
    } else if (mode === 'byFilter') {
      setConfig({ selectedGroupIds: byFilterGroups.map((g) => g.id) })
    } else {
      setConfig({ selectedGroupIds: manualSelectedIds })
    }
  }

  /**
   * Changement de filtre avec nettoyage automatique des valeurs devenues hors-scope.
   * Si on change gens/cats, on vérifie que year et label sont toujours valides.
   * Si on change year/label, on vérifie que gens/cats sont toujours valides.
   */
  function handleFilterChange(update: Partial<ArtistFilterState>) {
    const newFilters = { ...artistFilters, ...update }

    // Nettoyage cross-filtre
    if (update.gens !== undefined || update.cats !== undefined) {
      // Vérifier year
      if (newFilters.year !== 'all') {
        const p = { gens: newFilters.gens, cats: newFilters.cats, year: 'all', label: newFilters.label }
        const valid = new Set(allGroups.filter((g) => groupMatchesFilter(g, p)).map((g) => String(g.debutYear)))
        if (!valid.has(newFilters.year)) newFilters.year = 'all'
      }
      // Vérifier label
      if (newFilters.label !== 'all') {
        const p = { gens: newFilters.gens, cats: newFilters.cats, year: newFilters.year, label: 'all' }
        const valid = new Set(
          allGroups
            .filter((g) => groupMatchesFilter(g, p))
            .map((g) => g.company)
            .filter(Boolean),
        )
        if (!valid.has(newFilters.label)) newFilters.label = 'all'
      }
    }

    setArtistFilters(newFilters)

    if (artistMode === 'byFilter') {
      const filtered = applyGroupFilters(allGroups, newFilters)
      setConfig({ selectedGroupIds: filtered.map((g) => g.id) })
    }
  }

  function handleManualSelectionChange(ids: string[]) {
    setManualSelectedIds(ids)
    if (artistMode === 'manual') {
      setConfig({ selectedGroupIds: ids })
    }
  }

  // ── canLaunch + launch ────────────────────────────────────────────────────

  const canLaunch = !twoPlayerInvalid && (isCustom ? prepared : true)

  function launch() {
    if (!canLaunch) return
    navigate(GAME_ROUTES[config.mode] ?? '/game/save-one')
  }

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* ── Bandeau préparation ── */}
      {isCustom && <PrepBanner status={prepStatus} result={prepResult} error={prepError} styles={styles} />}

      {/* ══ CHOIX DU JEU ══ */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Choix du jeu</p>
        <ConfigCard>
          <div className={styles.fieldsRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Type de quiz</span>
              <SelectControl
                value={config.mode}
                onChange={(value) => setConfig({ mode: value as GameConfig['mode'] })}
                options={QUIZ_TYPES_OPTIONS}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Catégorie</span>
              <SelectControl
                value={config.category}
                onChange={(value) => setConfig({ category: value as GameConfig['category'] })}
                options={QUIZ_CATEGORIES_OPTIONS}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Mode de jeu</span>
              <SelectControl
                value={config.gamePlayMode}
                onChange={(value) => handlePlayModeChange(value as GamePlayMode)}
                options={GAME_PLAY_MODES}
              />
            </div>
          </div>
        </ConfigCard>
      </div>

      {/* ══ OPTIONS DE LA PARTIE ══ */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>Options de la partie</p>
        <ConfigCard>
          <div className={styles.fieldsRow}>
            {/* Drops — Save One uniquement */}
            {isSaveOne && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Drops</span>
                <SegmentedControl
                  value={config.drops.toString()}
                  options={DROPS_OPTIONS}
                  onChange={(v) => setConfig({ drops: parseInt(v) })}
                />
              </div>
            )}

            {/* Timer — SegmentedControl */}
            <div
              className={[styles.field, !playMode.timerEditable ? styles.fieldDisabled : ''].filter(Boolean).join(' ')}
            >
              <span className={styles.fieldLabel}>Timer</span>
              <SegmentedControl
                value={playMode.timerEditable ? config.timerSeconds.toString() : playMode.timerDefault.toString()}
                options={TIMER_OPTIONS}
                onChange={(v) => setConfig({ timerSeconds: parseInt(v) })}
              />
              {!playMode.timerEditable && <span className={styles.fieldHint}>Fixé par le mode de jeu.</span>}
            </div>

            {/* Rounds — clampedMax persistant même après changement de rounds */}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Rounds</span>
              <SliderControl
                value={config.rounds}
                onChange={(v) => setConfig({ rounds: v })}
                min={2}
                max={20}
                clampedMax={roundsClampedMax}
                onClampReset={() => {
                  /* reset géré par useEffect prepStatus */
                }}
              />
            </div>

            {/* Durée extrait — chansons uniquement */}
            {isSongs && (
              <div
                className={[styles.field, !playMode.clipEditable ? styles.fieldDisabled : ''].filter(Boolean).join(' ')}
              >
                <span className={styles.fieldLabel}>Durée des extraits</span>
                <SliderControl
                  value={playMode.clipEditable ? config.clipDuration : playMode.clipDefault}
                  onChange={(v) => setConfig({ clipDuration: v })}
                  min={1}
                  max={15}
                  disabled={!playMode.clipEditable}
                />
                {!playMode.clipEditable && <span className={styles.fieldHint}>Fixé par le mode de jeu.</span>}
              </div>
            )}

            {/* Mode 2 joueurs */}
            <div>
              <div className={styles.twoPlayerRow}>
                <div className={styles.twoPlayerLeft}>
                  <span className={styles.fieldLabel}>Mode 2 joueurs</span>
                  <ToggleControl checked={config.twoPlayerMode} onChange={handleTwoPlayerToggle} />
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
            </div>
          </div>
        </ConfigCard>
      </div>

      {/* ══ OPTIONS SUPPLÉMENTAIRES (Personnalisé) ══ */}
      {isCustom && (
        <>
          {(isIdols || isSongs) && (
            <div className={styles.section}>
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
                        <span className={styles.fieldLabel}>Rôles</span>
                        <BadgeGroupControl<RoleCriterion>
                          options={[
                            { value: defaultOptionValue, label: 'Tous' },
                            ...availableRoles.map((r) => ({ value: r as RoleCriterion, label: ROLE_LABELS[r] })),
                          ]}
                          value={
                            config.roleFilters.length === 0
                              ? [defaultOptionValue]
                              : (config.roleFilters as RoleCriterion[])
                          }
                          onChange={(vals) => {
                            if (vals.includes(defaultOptionValue) && config.roleFilters.length > 0) {
                              setConfig({ roleFilters: [] })
                            } else {
                              setConfig({ roleFilters: vals.filter((v) => v !== defaultOptionValue) as MemberRole[] })
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
                          onChange={(v) => setConfig({ songType: v[0] ?? defaultOptionValue })}
                          size="sm"
                        />
                      </div>
                      <div className={styles.optionGroup}>
                        <span className={styles.fieldLabel}>Langue</span>
                        <BadgeGroupControl<LanguageOption>
                          options={songLanguageOptions}
                          value={[config.songLanguage]}
                          onChange={(v) => setConfig({ songLanguage: v[0] ?? defaultOptionValue })}
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
              onArtistModeChange={handleArtistModeChange}
              manualSelectedIds={manualSelectedIds}
              onManualSelectionChange={handleManualSelectionChange}
              allGroups={allGroups}
              loading={loading}
              filters={artistFilters}
              onFilterChange={handleFilterChange}
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
            <span className={styles.prepBannerText}>{result.clampMessage && <> {result.clampMessage}</>}</span>
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
