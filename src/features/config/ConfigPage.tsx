import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { PageContainer } from '@/shared/Layout'
import { ToggleControl } from '@/shared/Controls/ToggleControl'
import { FilterBadgeGroupControl } from '@/shared/Controls/FilterBadgeGroupControl'
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
  QuizMode,
  QuizCategory,
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

type GenFilter = 'all' | Generation
type CatFilter = 'all' | 'girlGroup' | 'boyGroup' | 'femaleSoloist' | 'maleSoloist' | 'subunit'

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

const CAT_FILTER_OPTIONS: { value: CatFilter; label: string }[] = [
  { value: 'all', label: 'Toutes catégories' },
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  // artistMode : mode UI courant (ne dépend pas directement de config.selectedGroupIds)
  const [artistMode, setArtistMode] = useState<'all' | 'byFilter' | 'manual'>(() =>
    config.selectedGroupIds.length === 0 ? 'all' : 'manual',
  )

  // FIXE BUG : La sélection manuelle est conservée en état local indépendant.
  // Passer en mode "Tous" ou "Par filtres" NE purge plus manualSelectedIds.
  // Seul le bouton "Vider" (dans ArtistSelector) efface cette sélection.
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>(config.selectedGroupIds)

  // ── Filtres artistes ──────────────────────────────────────────────────────

  const [artistFilters, setArtistFilters] = useState<ArtistFilterState>({
    gen: 'all',
    cat: 'all',
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

  // max clamped pour le slider Rounds — reset dès que la config change (status != 'adjusted')
  const roundsClampedMax = prepStatus === 'adjusted' && prepResult ? prepResult.maxRounds : undefined

  // ── Validation 2 joueurs ──────────────────────────────────────────────────

  const p1Empty = config.twoPlayerMode && !config.player1Name.trim()
  const p2Empty = config.twoPlayerMode && !config.player2Name.trim()
  const twoPlayerInvalid = config.twoPlayerMode && (p1Empty || p2Empty)

  // ── Groupes dérivés ───────────────────────────────────────────────────────

  const allGroups = useMemo(() => [...(groups ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [groups])

  const availableGens = useMemo<GenFilter[]>(() => {
    const gens = new Set<Generation>(allGroups.map((g) => g.generation as Generation))
    const order: Generation[] = ['1', '2', '3', '4', '5']
    return [defaultOptionValue, ...order.filter((g) => gens.has(g))]
  }, [allGroups])

  const availableYears = useMemo(() => {
    const years = [...new Set(allGroups.map((g) => String(g.debutYear)))].sort()
    return [...years]
  }, [allGroups])

  const availableLabels = useMemo(() => {
    const labels = [...new Set(allGroups.map((g) => g.company).filter(Boolean))].sort()
    return [...labels]
  }, [allGroups])

  const genFilterOptions = useMemo(
    () => availableGens.map((g) => ({ value: g, label: g === defaultOptionValue ? 'Toutes gen.' : `Gen ${g}` })),
    [availableGens],
  )

  const availableCatOptions = useMemo(() => {
    const cats = new Set(allGroups.map((g) => g.category))
    const hasSubunit = allGroups.some((g) => !!g.parentGroupId)
    return CAT_FILTER_OPTIONS.filter(
      (o) =>
        o.value === defaultOptionValue ||
        cats.has(o.value as Group['category']) ||
        (o.value === 'subunit' && hasSubunit),
    )
  }, [allGroups])

  const byFilterGroups = useMemo(
    () =>
      applyGroupFilters(
        allGroups,
        artistFilters.gen as GenFilter,
        artistFilters.cat as CatFilter,
        artistFilters.year,
        artistFilters.label,
      ),
    [allGroups, artistFilters],
  )

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

  /**
   * Gestion du changement de mode de sélection artiste.
   * La sélection manuelle (manualSelectedIds) est toujours conservée.
   * config.selectedGroupIds est mis à jour selon le mode actif.
   */
  function handleArtistModeChange(mode: 'all' | 'byFilter' | 'manual') {
    setArtistMode(mode)
    if (mode === 'all') {
      setConfig({ selectedGroupIds: [] })
    } else if (mode === 'byFilter') {
      setConfig({ selectedGroupIds: byFilterGroups.map((g) => g.id) })
    } else {
      // Mode manuel → rétablir la sélection manuelle mémorisée
      setConfig({ selectedGroupIds: manualSelectedIds })
    }
  }

  function handleFilterChange(update: Partial<ArtistFilterState>) {
    const newFilters = { ...artistFilters, ...update }
    setArtistFilters(newFilters)

    if (artistMode === 'byFilter') {
      const filtered = applyGroupFilters(
        allGroups,
        newFilters.gen as GenFilter,
        newFilters.cat as CatFilter,
        newFilters.year,
        newFilters.label,
      )
      setConfig({ selectedGroupIds: filtered.map((g) => g.id) })
    }
  }

  /**
   * Mise à jour de la sélection manuelle.
   * Met à jour manualSelectedIds ET config.selectedGroupIds (si en mode manuel).
   */
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
                onChange={(value) => setConfig({ mode: value as QuizMode })}
                options={QUIZ_TYPES_OPTIONS}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Catégorie</span>
              <SelectControl
                value={config.category}
                onChange={(value) => setConfig({ category: value as QuizCategory })}
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

            {/* Rounds — avec feedback de bridage si la préparation a clamped */}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Rounds</span>
              <SliderControl
                value={config.rounds}
                onChange={(v) => setConfig({ rounds: v })}
                min={2}
                max={20}
                clampedMax={roundsClampedMax}
                onClampReset={() => {
                  /* Le clamp est reset quand prepStatus change via useConfigPreparation */
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
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Options supplémentaires</p>

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
                        <span className={styles.fieldLabel}>
                          Rôles <span className={styles.fieldHint}>(plusieurs sélections possible)</span>
                        </span>
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
            )}
          </div>
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Sélection des artistes</p>
            {/* Sélection des artistes — composant partagé */}
            <ArtistSelector
              artistMode={artistMode}
              onArtistModeChange={handleArtistModeChange}
              manualSelectedIds={manualSelectedIds}
              onManualSelectionChange={handleManualSelectionChange}
              allGroups={allGroups}
              loading={!!loading}
              filters={artistFilters}
              onFilterChange={handleFilterChange}
              byFilterGroups={byFilterGroups}
              genOptions={genFilterOptions}
              catOptions={availableCatOptions}
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
