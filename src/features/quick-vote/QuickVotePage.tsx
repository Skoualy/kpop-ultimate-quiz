import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { AppHeader } from '@/shared/Layout/AppHeader'
import { GameHud } from '@/shared/Components/GameHud'
// RoundTransition et PlayerTransitionOverlay restent dans save-one pour l'instant
// TODO refactoring : migrer vers @/shared/Components/ avec IdolCard, TimerBar, etc.
import { RoundTransition } from '@/shared/Components/RoundTransition'
import { PlayerTransitionOverlay } from '@/shared/Components/PlayerTransitionOverlay'
import { QuickVoteRoundIdols } from './components/QuickVoteRoundIdols'
import { QuickVoteRoundSongs } from './components/QuickVoteRoundSongs'
import { QuickVoteSummary } from './components/QuickVoteSummary'
import { useQuickVoteGame } from './hooks/useQuickVoteGame'
import { QUICK_VOTE_LABELS, CRITERIA_LABELS, ROLE_LABELS } from '@/shared/constants'
import type { IdolItem, SongItem } from './QuickVotePage.types'
import styles from './QuickVotePage.module.scss'

// ─── Labels locaux (non encore centralisés dans /shared/constants) ────────────
// TODO : centraliser dans gameModes.ts et un futur songTypes.ts

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

  // ── Dérivés ──────────────────────────────────────────────────────────────────

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
  const voteLabels = QUICK_VOTE_LABELS[config.category]

  // ── Options HUD — identique à SaveOnePage, sans les drops ────────────────────

  const hudOptions = [
    { labelOption: 'Type de quiz', optionValue: `Quick Vote — ${voteLabels.title}` },
    { labelOption: 'Catégorie', optionValue: isIdols ? 'Idoles' : 'Chansons' },
    { labelOption: 'Mode de jeu', optionValue: GAMEPLAY_LABELS[config.gamePlayMode] ?? config.gamePlayMode },
    { labelOption: 'Timer', optionValue: config.timerSeconds > 0 ? `${config.timerSeconds}s` : 'Off' },
    isSongs ? { labelOption: 'Extrait', optionValue: `${config.clipDuration}s` } : null,
    isCustom && isIdols && config.roleFilters.length > 0
      ? { labelOption: 'Rôles', optionValue: config.roleFilters.map((r) => ROLE_LABELS[r] ?? r).join(', ') }
      : null,
    isCustom && isSongs && config.songType !== 'all'
      ? { labelOption: 'Type', optionValue: SONG_TYPE_LABELS[config.songType] ?? config.songType }
      : null,
  ].filter(Boolean) as { labelOption: string; optionValue: string | number }[]

  // const hudCriterion =
  //   isCustom && isIdols && config.criterion !== 'all'
  //     ? (CRITERIA_LABELS[config.criterion] ?? config.criterion)
  //     : undefined

  // ── Render : résumé ───────────────────────────────────────────────────────────

  if (phase === 'summary') {
    return (
      <div className={styles.root}>
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

  // ── Render : chargement / erreur ──────────────────────────────────────────────

  if (isLoading || error) {
    return (
      <div className={styles.root}>
        <AppHeader />
        <div className={styles.stateMessage}>
          {isLoading && <p>Chargement…</p>}
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </div>
    )
  }

  // ── Render : jeu ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* Zone de jeu */}
      <main className={styles.content}>
        {/* HUD — même structure que SaveOnePage, sans le bouton Passer */}
        <GameHud
          options={hudOptions}
          //criterion={hudCriterion}
          twoPlayer={twoPlayer}
          activePlayerName={twoPlayer ? activePlayer : undefined}
          activePlayerIndex={currentPlayer as 0 | 1}
          onBack={goToConfig}
          onPass={undefined} // Quick Vote n'a pas de bouton "Passer"
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
            voteLabel={voteLabels}
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
            voteLabel={voteLabels}
            onVote={vote}
            onTimeout={timeout}
          />
        )}
      </main>

      {/* Transitions inter-rounds */}
      {phase === 'roundTransition' && (
        <RoundTransition roundNumber={currentRoundIndex + 1} totalRounds={totalRounds} onDone={skipRoundTransition} />
      )}

      {/* Transition inter-joueurs (mode 2J) */}
      {phase === 'playerTransition' && <PlayerTransitionOverlay playerName={p2Name} onSkip={skipPlayerTransition} />}
    </div>
  )
}
