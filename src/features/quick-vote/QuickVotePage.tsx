import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { AppHeader } from '@/shared/Layout/AppHeader'
import { GameHud } from '@/shared/Components/GameHud'
import { PlayerTransitionOverlay } from '@/shared/Components/PlayerTransitionOverlay'
import { RoundTransition } from '@/shared/Components/RoundTransition'
import { QuickVoteRoundIdols } from './components/QuickVoteRoundIdols'
import { QuickVoteRoundSongs } from './components/QuickVoteRoundSongs'
import { QuickVoteSummary } from './components/QuickVoteSummary'
import { useQuickVoteGame } from './hooks/useQuickVoteGame'
import { QUICK_VOTE_LABELS, CRITERIA_LABELS, ROLE_LABELS } from '@/shared/constants'
import type { IdolItem, SongItem } from './QuickVotePage.types'
// Styles de layout partagés entre tous les jeux
import g from '@/styles/game.module.scss'

// ─── Labels locaux ────────────────────────────────────────────────────────────
// TODO : centraliser dans gameModes.ts + songTypes.ts

const GAMEPLAY_LABELS: Record<string, string> = {
  classic: 'Classique',
  chill: 'Chill',
  spectator: 'Spectateur',
  hardcore: 'Hardcore',
  custom: 'Personnalisé',
}

const SONG_TYPE_LABELS: Record<string, string> = {
  all: 'Tous types',
  titles: 'Titres',
  bSides: 'B-sides',
  debutSongs: 'Débuts',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuickVotePage() {
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
    vote,
    timeout,
    skipPlayerTransition,
    skipRoundTransition,
    restart,
  } = useQuickVoteGame(config)

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

  // ── Options HUD (sans Drops — 1 item/round implicite) ─────────────────────────

  const hudOptions = [
    { labelOption: 'Type de quiz', optionValue: `Smash or Pass` },
    { labelOption: 'Catégorie', optionValue: isIdols ? 'Idoles' : 'Chansons' },
    { labelOption: 'Mode de jeu', optionValue: GAMEPLAY_LABELS[config.gamePlayMode] ?? config.gamePlayMode },
    { labelOption: 'Rounds', optionValue: config.rounds },
    { labelOption: 'Timer', optionValue: config.timerSeconds > 0 ? `${config.timerSeconds}s` : 'Off' },
    isSongs ? { labelOption: 'Extrait', optionValue: `${config.clipDuration}s` } : null,
    isCustom && isIdols && config.roleFilters.length > 0
      ? { labelOption: 'Rôles', optionValue: config.roleFilters.map((r) => ROLE_LABELS[r] ?? r).join(', ') }
      : null,
    isCustom && isSongs && config.songType !== 'all'
      ? { labelOption: 'Type', optionValue: SONG_TYPE_LABELS[config.songType] ?? config.songType }
      : null,
  ].filter(Boolean) as { labelOption: string; optionValue: string | number }[]

  const hudCriterion =
    isCustom && isIdols && config.criterion !== 'all'
      ? (CRITERIA_LABELS[config.criterion] ?? config.criterion)
      : undefined

  // ── Chargement ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={g.page}>
        <AppHeader />
        <div className={g.center}>
          <div className={g.spinner} />
          <p>Chargement du pool…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={g.page}>
        <AppHeader />
        <div className={g.center}>
          <p className={g.errorTitle}>Erreur</p>
          <p className={g.errorMsg}>{error}</p>
          <button className={g.retryBtn} onClick={goToConfig}>
            ← Retour à la config
          </button>
        </div>
      </div>
    )
  }

  if (!isLoading && rounds.length === 0) {
    return (
      <div className={g.page}>
        <AppHeader />
        <div className={g.center}>
          <p className={g.emptyWarn}>⚠️ Pool vide — aucun élément ne correspond aux filtres configurés.</p>
          <button className={g.retryBtn} onClick={goToConfig}>
            ← Retour à la config
          </button>
        </div>
      </div>
    )
  }

  // ── Résumé ────────────────────────────────────────────────────────────────────

  if (phase === 'summary') {
    return (
      <div className={[g.page, g.pageSummary].join(' ')}>
        <AppHeader />
        <QuickVoteSummary
          rounds={rounds}
          results={results}
          config={config}
          onRestart={restart}
          onBackToConfig={goToConfig}
        />
      </div>
    )
  }

  // ── Jeu ───────────────────────────────────────────────────────────────────────

  return (
    <div className={g.page}>
      <main className={g.content}>
        {/* HUD — pas de bouton Passer en Smash or Pass */}
        <GameHud
          options={hudOptions}
          twoPlayer={twoPlayer}
          activePlayerName={twoPlayer && isPlaying ? activePlayer : undefined}
          activePlayerIndex={currentPlayer as 0 | 1}
          onBack={goToConfig}
          onPass={undefined}
          actionDisabled={true}
          currentRound={currentRoundIndex + 1}
          totalRounds={totalRounds}
        />

        {/* Round idoles */}
        {isPlaying && currentRound && isIdols && (
          <QuickVoteRoundIdols
            idol={currentRound.items[0] as IdolItem}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            activeCriterion={currentRound.activeCriterion}
            voteLabel={QUICK_VOTE_LABELS}
            onVote={vote}
            onTimeout={timeout}
          />
        )}

        {/* Round chansons */}
        {isPlaying && currentRound && isSongs && (
          <QuickVoteRoundSongs
            song={currentRound.items[0] as SongItem}
            clipDuration={config.clipDuration}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            voteLabel={QUICK_VOTE_LABELS}
            onVote={vote}
            onTimeout={timeout}
          />
        )}

        {!isPlaying && phase !== 'summary' && <div className={g.transitionBlank} />}
      </main>

      {phase === 'roundTransition' && (
        <RoundTransition roundNumber={currentRoundIndex + 1} totalRounds={totalRounds} onDone={skipRoundTransition} />
      )}
      {phase === 'playerTransition' && <PlayerTransitionOverlay playerName={p2Name} onSkip={skipPlayerTransition} />}
    </div>
  )
}
