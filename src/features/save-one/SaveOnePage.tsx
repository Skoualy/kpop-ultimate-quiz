import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { GameHeader } from '@/shared/Layout/GameHeader'
import { GameHud } from '@/shared/Components/GameHud'
import { PlayerTransitionOverlay } from './components/PlayerTransitionOverlay'
import { RoundTransition } from './components/RoundTransition'
import { SaveOneRoundIdols } from './components/SaveOneRoundIdols'
import { SaveOneRoundSongs } from './components/SaveOneRoundSongs'
import { SaveOneSummary } from './components/SaveOneSummary'
import { useSaveOneGame } from './hooks/useSaveOneGame'
import type { IdolItem, SongItem } from './SaveOnePage.types'
import styles from './SaveOnePage.module.scss'

const CRITERIA_LABELS: Record<string, string> = {
  all: 'Tous', beauty: 'Beauté', personality: 'Personnalité',
  voice: 'Voix', performance: 'Performance', leadership: 'Leadership',
  aegyo: 'Aegyo', random: 'Aléatoire',
}
const ROLE_LABELS: Record<string, string> = {
  leader: 'Leader', mainVocal: 'V. Principale', vocal: 'Vocal',
  mainDancer: 'D. Principal', dancer: 'Danseur', mainRapper: 'R. Principal',
  rapper: 'Rappeur', visual: 'Visual', maknae: 'Maknae',
}
const SONG_TYPE_LABELS: Record<string, string> = {
  all: 'Tous types', titles: 'Titres', bSides: 'B-sides', debutSongs: 'Débuts',
}
const GAMEPLAY_LABELS: Record<string, string> = {
  classic: 'Classique', chill: 'Chill', spectator: 'Spectateur',
  hardcore: 'Hardcore', custom: 'Personnalisé',
}

export default function SaveOnePage() {
  const navigate   = useNavigate()
  const { config } = useGameContext()

  const {
    phase, isLoading, error, rounds, results,
    currentRoundIndex, currentPlayer, timerKey,
    choose, pass, timeout, skipPlayerTransition, skipRoundTransition, restart,
  } = useSaveOneGame(config)

  const goToConfig = useCallback(() => navigate('/'), [navigate])

  const currentRound = rounds[currentRoundIndex]
  const totalRounds  = rounds.length
  const twoPlayer    = config.twoPlayerMode
  const p1Name       = config.player1Name || 'Joueur 1'
  const p2Name       = config.player2Name || 'Joueur 2'
  const activePlayer = currentPlayer === 0 ? p1Name : p2Name
  const isIdols      = config.category === 'idols'
  const isSongs      = config.category === 'songs'
  const isPlaying    = phase === 'playing'
  const isCustom     = config.gamePlayMode === 'custom'

  // ── Options HUD ──────────────────────────────────────────────────────────

  const hudOptions = [
    { label: 'Drops', value: config.drops },
    // Timer TOUJOURS affiché même si désactivé
    config.timerSeconds > 0
      ? { label: 'Timer', value: `${config.timerSeconds}s` }
      : { label: 'Timer', value: 'Off' },
    isSongs ? { label: 'Extrait', value: `${config.clipDuration}s` } : null,
  ]

  // Critère pour le badge gradient (mode custom idoles, hors 'all')
  const hudCriterion: string | null = (isCustom && isIdols && config.criterion !== 'all')
    ? (CRITERIA_LABELS[config.criterion] ?? config.criterion)
    : null

  // Options supplémentaires textuelles (rôles, type chansons)
  const hudExtras: string[] = []
  if (isCustom && isIdols && config.roleFilters.length > 0)
    hudExtras.push(config.roleFilters.map((r) => ROLE_LABELS[r] ?? r).join(', '))
  if (isCustom && isSongs && config.songType !== 'all')
    hudExtras.push(SONG_TYPE_LABELS[config.songType] ?? config.songType)

  // ── Chargement / erreur / pool vide ──────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}><div className={styles.spinner} /><p>Chargement du pool…</p></div>
      </div>
    )
  }
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.errorTitle}>Erreur</p>
          <p className={styles.errorMsg}>{error}</p>
          <button className={styles.retryBtn} onClick={goToConfig}>← Retour à la config</button>
        </div>
      </div>
    )
  }
  if (!isLoading && rounds.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.emptyWarn}>⚠️ Pool vide — aucun élément ne correspond aux filtres configurés.</p>
          <button className={styles.retryBtn} onClick={goToConfig}>← Retour à la config</button>
        </div>
      </div>
    )
  }

  // ── Résumé ────────────────────────────────────────────────────────────────

  if (phase === 'summary') {
    return (
      <div className={[styles.page, styles.pageSummary].join(' ')}>
        <SaveOneSummary rounds={rounds} results={results} config={config} onRestart={restart} onBackToConfig={goToConfig} />
      </div>
    )
  }

  // ── Jeu ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Header générique */}
      <GameHeader
        onBack={goToConfig}
        onAction={() => pass()}
        actionLabel="⏭ Passer le round"
        actionDisabled={!isPlaying}
        playerName={twoPlayer && isPlaying ? activePlayer : undefined}
        playerIndex={currentPlayer}
      />

      {/* Zone de jeu */}
      <main className={styles.content}>

        {/* HUD générique */}
        <GameHud
          quizType="Save One"
          category={isIdols ? 'Idoles' : 'Chansons'}
          gameMode={GAMEPLAY_LABELS[config.gamePlayMode] ?? config.gamePlayMode}
          currentRound={currentRoundIndex + 1}
          totalRounds={totalRounds}
          options={hudOptions}
          criterion={hudCriterion}
          twoPlayer={twoPlayer}
        />

        {/* Contenu de jeu — démonté pendant transitions */}
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

        {isPlaying && currentRound && isSongs && (
          <SaveOneRoundSongs
            songs={currentRound.items as SongItem[]}
            clipDuration={config.clipDuration}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            player2Mode={twoPlayer && currentPlayer === 1}
            playerName={twoPlayer ? activePlayer : undefined}
            playerIndex={currentPlayer}
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
      {phase === 'playerTransition' && (
        <PlayerTransitionOverlay playerName={p2Name} onSkip={skipPlayerTransition} />
      )}
    </div>
  )
}
