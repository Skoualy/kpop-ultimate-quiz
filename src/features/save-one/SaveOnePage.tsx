import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { PlayerTransitionOverlay } from './components/PlayerTransitionOverlay'
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

  // Seule la phase 'playing' affiche le contenu de jeu.
  // Pendant les transitions, le composant de jeu est démonté → iframes stoppées.
  const isPlaying = phase === 'playing'

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
          <p className={styles.emptyWarn}>
            ⚠️ Pool vide — aucun élément ne correspond aux filtres configurés.
          </p>
          <button className={styles.retryBtn} onClick={goToConfig}>← Retour à la config</button>
        </div>
      </div>
    )
  }

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

  return (
    <div className={styles.page}>

      {/* ── Barre unique : back / infos centrées / pass ── */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={goToConfig}>← Config</button>

        {/* Centre : tout groupé */}
        <div className={styles.headerCenter}>
          {/* Progression rounds */}
          <div className={styles.roundPill}>
            <span className={styles.roundPillLabel}>Round</span>
            <span className={styles.roundPillValue}>
              {currentRoundIndex + 1}
              <span className={styles.roundPillTotal}> / {totalRounds}</span>
            </span>
          </div>

          {/* Séparateur */}
          <span className={styles.headerSep}>·</span>

          {/* Mode */}
          <span className={[styles.infoPill, styles.infoPillAccent].join(' ')}>Save One</span>
          <span className={styles.infoPill}>{isIdols ? 'Idoles' : 'Chansons'}</span>
          <span className={styles.infoPill}>Drop {config.drops}</span>
          {config.timerSeconds > 0 && (
            <span className={styles.infoPill}>⏱ {config.timerSeconds}s</span>
          )}
          {isSongs && (
            <span className={styles.infoPill}>▶ {config.clipDuration}s</span>
          )}
        </div>

        {/* Bouton Passer — top-right */}
        <button
          className={[styles.passBtn, !isPlaying ? styles.passBtnHidden : ''].join(' ')}
          onClick={() => pass()}
          disabled={!isPlaying}
          title="Passer ce round"
        >
          ⏭ Passer
        </button>
      </header>

      {/* ── Contenu de jeu — démonté pendant les transitions ── */}
      <main className={styles.content}>
        {isPlaying && currentRound && isIdols && (
          <SaveOneRoundIdols
            idols={currentRound.items as IdolItem[]}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            playerName={twoPlayer ? activePlayer : undefined}
            playerIndex={currentPlayer}
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

        {/* Pendant les transitions, afficher un fond neutre */}
        {!isPlaying && phase !== 'summary' && (
          <div className={styles.transitionBlank} />
        )}
      </main>

      {/* ── Transition entre rounds (overlay plein écran) ── */}
      {phase === 'roundTransition' && (
        <RoundTransition
          roundNumber={currentRoundIndex + 1}
          totalRounds={totalRounds}
          onDone={skipRoundTransition}
        />
      )}

      {/* ── Transition entre joueurs (overlay plein écran) ── */}
      {phase === 'playerTransition' && (
        <PlayerTransitionOverlay
          playerName={p2Name}
          onSkip={skipPlayerTransition}
        />
      )}
    </div>
  )
}
