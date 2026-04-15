import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { PlayerTransitionOverlay } from './components/PlayerTransitionOverlay'
import { RoundProgressBar } from './components/RoundProgressBar'
import { RoundTransition } from './components/RoundTransition'
import { SaveOneRoundIdols } from './components/SaveOneRoundIdols'
import { SaveOneRoundSongs } from './components/SaveOneRoundSongs'
import { SaveOneSummary } from './components/SaveOneSummary'
import { useSaveOneGame } from './hooks/useSaveOneGame'
import type { IdolItem, SongItem } from './SaveOnePage.types'
import styles from './SaveOnePage.module.scss'

const GAMEPLAY_MODE_LABELS: Record<string, string> = {
  classic:   'Classique',
  chill:     'Chill',
  spectator: 'Spectateur',
  hardcore:  'Hardcore',
  custom:    'Personnalisé',
}

export default function SaveOnePage() {
  const navigate   = useNavigate()
  // La config vit dans GameContext (persistée en localStorage, toujours disponible)
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
  const totalRounds  = rounds.length
  const twoPlayer    = config.twoPlayerMode
  const p1Name       = config.player1Name || 'Joueur 1'
  const p2Name       = config.player2Name || 'Joueur 2'
  const activePlayer = currentPlayer === 0 ? p1Name : p2Name
  const isIdols      = config.category === 'idols'
  const isSongs      = config.category === 'songs'

  // ── Chargement ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <div className={styles.spinner} />
          <p>Chargement du pool…</p>
        </div>
      </div>
    )
  }

  // ── Erreur ────────────────────────────────────────────────────────────────

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

  // ── Pool vide ────────────────────────────────────────────────────────────

  if (!isLoading && rounds.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.emptyWarn}>
            ⚠️ Pool vide — aucun élément ne correspond aux filtres configurés.
            <br />Vérifiez vos groupes et filtres.
          </p>
          <button className={styles.retryBtn} onClick={goToConfig}>← Retour à la config</button>
        </div>
      </div>
    )
  }

  // ── Résumé ────────────────────────────────────────────────────────────────

  if (phase === 'summary') {
    return (
      <div className={[styles.page, styles.pageSummary].join(' ')}>
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

  // ── Écran de jeu ──────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={goToConfig}>← Config</button>
          <RoundProgressBar current={currentRoundIndex + 1} total={totalRounds} />
          <span className={styles.modePill}>
            Drop {config.drops} · {config.drops + 1} choix
          </span>
          {twoPlayer && (
            <span className={styles.playerPill}>{activePlayer}</span>
          )}
        </div>

        <div className={styles.headerRight}>

          {phase === 'playing' && (
            <button className={styles.passBtn} onClick={() => pass()} title="Passer ce round">
              ⏭ Passer
            </button>
          )}
        </div>
      </header>

      {/* ── Badges de mode ── */}
      <div className={styles.modeBadges}>
        <span className={[styles.modePill, styles.modePillAccent].join(' ')}>Save One</span>
        <span className={styles.modePill}>{isIdols ? 'Idoles' : 'Chansons'}</span>
        <span className={styles.modePill}>{GAMEPLAY_MODE_LABELS[config.gamePlayMode]}</span>
        {config.timerSeconds > 0 && (
          <span className={styles.modePill}>⏱ {config.timerSeconds}s</span>
        )}
        {isSongs && (
          <span className={styles.modePill}>▶ {config.clipDuration}s extrait</span>
        )}
      </div>

      {/* ── Contenu principal ── */}
      <main className={styles.content}>
        {currentRound && isIdols && (
          <SaveOneRoundIdols
            idols={currentRound.items as IdolItem[]}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            playerName={twoPlayer ? activePlayer : undefined}
            activeCriterion={currentRound.activeCriterion}
            onChoose={(id, ms) => choose(id, ms)}
            onPass={(ms) => pass(ms)}
            onTimeout={timeout}
          />
        )}
        {currentRound && isSongs && (
          <SaveOneRoundSongs
            songs={currentRound.items as SongItem[]}
            clipDuration={config.clipDuration}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            player2Mode={twoPlayer && currentPlayer === 1}
            onChoose={(id, ms) => choose(id, ms)}
            onPass={(ms) => pass(ms)}
            onTimeout={timeout}
          />
        )}
      </main>

      {/* ── Transition entre rounds ── */}
      {phase === 'roundTransition' && (
        <RoundTransition
          roundNumber={currentRoundIndex + 1}
          totalRounds={totalRounds}
          onDone={skipRoundTransition}
        />
      )}

      {/* ── Transition entre joueurs (2J) ── */}
      {phase === 'playerTransition' && (
        <PlayerTransitionOverlay
          playerName={p2Name}
          onSkip={skipPlayerTransition}
        />
      )}
    </div>
  )
}
