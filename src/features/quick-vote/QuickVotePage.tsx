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
import { useFullscreen } from '@/shared/hooks/useFullscreen'
import {
  QUICK_VOTE_LABELS,
  ROLE_LABELS,
  GAME_OPTION_ICONS,
  GAME_PLAY_MODE_MAP,
  SONG_TYPE_OPTIONS_MAP,
} from '@/shared/constants'
import type { IdolItem, SongItem } from './QuickVotePage.types'
import g from '@/styles/game.module.scss'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuickVotePage() {
  const navigate = useNavigate()
  const { config } = useGameContext()
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

  const {
    phase,
    isLoading,
    error,
    rounds,
    results,
    currentRoundIndex,
    currentPlayer,
    timerKey,
    pass,
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

  // ── Options HUD ───────────────────────────────────────────────────────────

  const hudOptions = [
    { icon: GAME_OPTION_ICONS['Type de quiz'], labelOption: 'Type de quiz', optionValue: 'Smash or Pass' },
    { icon: GAME_OPTION_ICONS['Catégorie'], labelOption: 'Catégorie', optionValue: isIdols ? 'Idoles' : 'Chansons' },
    {
      icon: GAME_OPTION_ICONS['Mode de jeu'],
      labelOption: 'Mode de jeu',
      optionValue: GAME_PLAY_MODE_MAP[config.gamePlayMode].label ?? config.gamePlayMode,
    },
    { icon: GAME_OPTION_ICONS['Rounds'], labelOption: 'Rounds', optionValue: config.rounds },
    {
      icon: GAME_OPTION_ICONS['Timer'],
      labelOption: 'Timer',
      optionValue: config.timerSeconds > 0 ? `${config.timerSeconds}s` : 'Off',
    },
    isSongs
      ? { icon: GAME_OPTION_ICONS['Extrait'], labelOption: 'Extrait', optionValue: `${config.clipDuration}s` }
      : null,
    isCustom && isIdols && config.roleFilters.length > 0
      ? {
          icon: GAME_OPTION_ICONS['Rôles'],
          labelOption: 'Rôles',
          optionValue: config.roleFilters.map((r) => ROLE_LABELS[r] ?? r).join(', '),
        }
      : null,
    isCustom && isSongs && config.songType !== 'all'
      ? {
          icon: GAME_OPTION_ICONS['Type'],
          labelOption: 'Type',
          optionValue: SONG_TYPE_OPTIONS_MAP[config.songType].label ?? config.songType,
        }
      : null,
  ].filter(Boolean) as { icon?: string; labelOption: string; optionValue: string | number }[]

  // ── Chargement ────────────────────────────────────────────────────────────

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

  // ── Résumé ────────────────────────────────────────────────────────────────

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

  // ── Jeu ───────────────────────────────────────────────────────────────────

  return (
    <div className={g.page}>
      <main className={g.content}>
        <GameHud
          options={hudOptions}
          activePlayerName={twoPlayer && isPlaying ? activePlayer : undefined}
          activePlayerIndex={currentPlayer as 0 | 1}
          onBack={goToConfig}
          onPass={() => pass()}
          currentRound={currentRoundIndex + 1}
          totalRounds={totalRounds}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
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

        {/* Espace vide pendant les transitions */}
        {!isPlaying && phase !== 'summary' && <div className={g.transitionBlank} />}
      </main>

      {/* Overlays — EN DEHORS de <main> */}
      {phase === 'roundTransition' && (
        <RoundTransition roundNumber={currentRoundIndex + 1} totalRounds={totalRounds} onDone={skipRoundTransition} />
      )}
      {phase === 'playerTransition' && <PlayerTransitionOverlay playerName={p2Name} onSkip={skipPlayerTransition} />}
    </div>
  )
}
