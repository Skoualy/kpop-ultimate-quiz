import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { AppHeader } from '@/shared/Layout/AppHeader'
import { GameHud } from '@/shared/Components/GameHud'
import { PlayerTransitionOverlay } from './components/PlayerTransitionOverlay'
import { RoundTransition } from './components/RoundTransition'
import { SaveOneRoundIdols } from './components/SaveOneRoundIdols'
import { SaveOneRoundSongs } from './components/SaveOneRoundSongs'
import { SaveOneSummary } from './components/SaveOneSummary'
import { useSaveOneGame } from './hooks/useSaveOneGame'
import type { IdolItem, SongItem } from './SaveOnePage.types'
import styles from './SaveOnePage.module.scss'

// ─── Mappings ─────────────────────────────────────────────────────────────────

const CRITERIA_LABELS: Record<string, string> = {
  all: 'Tous',
  beauty: 'Beauté',
  personality: 'Personnalité',
  voice: 'Voix',
  performance: 'Performance',
  leadership: 'Leadership',
  aegyo: 'Aegyo',
  random: 'Aléatoire',
}
const ROLE_LABELS: Record<string, string> = {
  leader: 'Leader',
  mainVocal: 'V. Principale',
  vocal: 'Vocal',
  mainDancer: 'D. Principal',
  dancer: 'Danseur',
  mainRapper: 'R. Principal',
  rapper: 'Rappeur',
  visual: 'Visual',
  maknae: 'Maknae',
}
const SONG_TYPE_LABELS: Record<string, string> = {
  all: 'Tous types',
  titles: 'Titres',
  bSides: 'B-sides',
  debutSongs: 'Débuts',
}
const GAMEPLAY_LABELS: Record<string, string> = {
  classic: 'Classique',
  chill: 'Chill',
  spectator: 'Spectateur',
  hardcore: 'Hardcore',
  custom: 'Personnalisé',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaveOnePage() {
  const navigate = useNavigate()
  const { config } = useGameContext()

  const {
    phase,
    isLoading,
    error,
    rounds,
    results,
    currentRoundIndex,
    currentPlayer,
    timerKey,
    choose,
    pass,
    timeout,
    skipPlayerTransition,
    skipRoundTransition,
    restart,
  } = useSaveOneGame(config)

  const goToConfig = useCallback(() => navigate('/'), [navigate])

  const currentRound = rounds[currentRoundIndex]
  const totalRounds = rounds.length
  const twoPlayer = config.twoPlayerMode
  const p1Name = config.player1Name || 'Joueur 1'
  const p2Name = config.player2Name || 'Joueur 2'
  const activePlayer = currentPlayer === 0 ? p1Name : p2Name
  const isIdols = config.category === 'idols'
  const isSongs = config.category === 'songs'
  const isPlaying = phase === 'playing'
  const isCustom = config.gamePlayMode === 'custom'

  // ── Options HUD ──────────────────────────────────────────────────────────

  const hudOptions = [
    { labelOption: 'Type de quiz', optionValue: 'Save One' },
    { labelOption: 'Catégorie', optionValue: isIdols ? 'Idoles' : 'Chansons' },
    { labelOption: 'Mode de jeu', optionValue: GAMEPLAY_LABELS[config.gamePlayMode] ?? config.gamePlayMode },
    { labelOption: 'Drops', optionValue: config.drops },
    // Timer toujours affiché
    { labelOption: 'Timer', optionValue: config.timerSeconds > 0 ? `${config.timerSeconds}s` : 'Off' },
    // Extrait uniquement pour les chansons
    isSongs ? { labelOption: 'Extrait', optionValue: `${config.clipDuration}s` } : null,
    // Rôles (mode custom idoles)
    isCustom && isIdols && config.roleFilters.length > 0
      ? { labelOption: 'Rôles', optionValue: config.roleFilters.map((r) => ROLE_LABELS[r] ?? r).join(', ') }
      : null,
    // Type chansons (mode custom chansons)
    isCustom && isSongs && config.songType !== 'all'
      ? { labelOption: 'Type', optionValue: SONG_TYPE_LABELS[config.songType] ?? config.songType }
      : null,
  ]

  // Critère (mode custom idoles, hors 'all')
  const hudCriterion =
    isCustom && isIdols && config.criterion !== 'all' ? (CRITERIA_LABELS[config.criterion] ?? config.criterion) : null

  // ── États de chargement / erreur / vide ──────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.page}>
        <AppHeader />
        <div className={styles.center}>
          <div className={styles.spinner} />
          <p>Chargement du pool…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <AppHeader />
        <div className={styles.center}>
          <p className={styles.errorTitle}>Erreur</p>
          <p className={styles.errorMsg}>{error}</p>
          <button className={styles.retryBtn} onClick={goToConfig}>
            ← Retour à la config
          </button>
        </div>
      </div>
    )
  }

  if (!isLoading && rounds.length === 0) {
    return (
      <div className={styles.page}>
        <AppHeader />
        <div className={styles.center}>
          <p className={styles.emptyWarn}>⚠️ Pool vide — aucun élément ne correspond aux filtres configurés.</p>
          <button className={styles.retryBtn} onClick={goToConfig}>
            ← Retour à la config
          </button>
        </div>
      </div>
    )
  }

  // ── Résumé ────────────────────────────────────────────────────────────────

  if (phase === 'summary') {
    return (
      <div className={[styles.page, styles.pageSummary].join(' ')}>
        <AppHeader />
        <SaveOneSummary
          rounds={rounds}
          results={results}
          config={config}
          onRestart={restart}
          onBackToConfig={goToConfig}
        />
      </div>
    )
  }

  // ── Jeu ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Header universel — center = back | round | pass */}
      <AppHeader />

      {/* Zone de jeu */}
      <main className={styles.content}>
        {/* HUD — options + critère + joueur actif 2J */}
        <GameHud
          options={hudOptions}
          criterion={hudCriterion}
          twoPlayer={twoPlayer}
          activePlayerName={twoPlayer && isPlaying ? activePlayer : undefined}
          activePlayerIndex={currentPlayer as 0 | 1}
          onBack={goToConfig}
          onAction={() => pass()}
          actionDisabled={!isPlaying}
          currentRound={currentRoundIndex + 1}
          totalRounds={totalRounds}
        />

        {/* Idoles */}
        {isPlaying && currentRound && isIdols && (
          <SaveOneRoundIdols
            idols={currentRound.items as IdolItem[]}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            activeCriterion={currentRound.activeCriterion}
            onChoose={(id, ms) => choose(id, ms)}
            onPass={(ms) => pass(ms)}
            onTimeout={timeout}
          />
        )}

        {/* Chansons — playerName uniquement en Songs (affiche dans iframe zone) */}
        {isPlaying && currentRound && isSongs && (
          <SaveOneRoundSongs
            songs={currentRound.items as SongItem[]}
            clipDuration={config.clipDuration}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            player2Mode={twoPlayer && currentPlayer === 1}
            playerName={undefined}
            playerIndex={currentPlayer as 0 | 1}
            onChoose={(id, ms) => choose(id, ms)}
            onPass={(ms) => pass(ms)}
            onTimeout={timeout}
          />
        )}

        {!isPlaying && phase !== 'summary' && <div className={styles.transitionBlank} />}
      </main>

      {phase === 'roundTransition' && (
        <RoundTransition roundNumber={currentRoundIndex + 1} totalRounds={totalRounds} onDone={skipRoundTransition} />
      )}
      {phase === 'playerTransition' && <PlayerTransitionOverlay playerName={p2Name} onSkip={skipPlayerTransition} />}
    </div>
  )
}
