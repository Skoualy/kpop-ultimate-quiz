import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { AppHeader } from '@/shared/Layout/AppHeader'
import { GameHud } from '@/shared/Components/GameHud'
import { PlayerTransitionOverlay } from '../../shared/Components/PlayerTransitionOverlay'
import { RoundTransition } from '../../shared/Components/RoundTransition'
import { SaveOneRoundIdols } from './components/SaveOneRoundIdols'
import { SaveOneRoundSongs } from './components/SaveOneRoundSongs'
import { SaveOneSummary } from './components/SaveOneSummary'
import { useSaveOneGame } from './hooks/useSaveOneGame'
import { useFullscreen } from '@/shared/hooks/useFullscreen'
import { GAME_OPTION_ICONS, GAME_PLAY_MODE_MAP, ROLE_LABELS, SONG_TYPE_OPTIONS_MAP } from '@/shared/constants'
import type { IdolItem, SongItem } from './SaveOnePage.types'
import g from '@/styles/game.module.scss'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaveOnePage() {
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

  // ── Options HUD ───────────────────────────────────────────────────────────

  const hudOptions = [
    { icon: GAME_OPTION_ICONS['Type de quiz'], labelOption: 'Type de quiz', optionValue: 'Save One' },
    { icon: GAME_OPTION_ICONS['Drops'], labelOption: 'Drops', optionValue: `Drop ${config.drops}` },
    { icon: GAME_OPTION_ICONS['Catégorie'], labelOption: 'Catégorie', optionValue: isIdols ? 'Idoles' : 'Chansons' },
    {
      icon: GAME_OPTION_ICONS['Mode de jeu'],
      labelOption: 'Mode de jeu',
      optionValue: GAME_PLAY_MODE_MAP[config.gamePlayMode].label ?? config.gamePlayMode,
    },
    config.timerSeconds > 0
      ? { icon: GAME_OPTION_ICONS['Timer'], labelOption: 'Timer', optionValue: `${config.timerSeconds}s` }
      : null,
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
  ]

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
    <div className={g.page}>
      <main className={g.content}>
        <GameHud
          options={hudOptions}
          twoPlayer={twoPlayer}
          activePlayerName={twoPlayer && isPlaying ? activePlayer : undefined}
          activePlayerIndex={currentPlayer as 0 | 1}
          onBack={goToConfig}
          onPass={() => pass()}
          actionDisabled={!isPlaying}
          currentRound={currentRoundIndex + 1}
          totalRounds={totalRounds}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Contenu du round idoles */}
        {isPlaying && currentRound && isIdols && (
          <SaveOneRoundIdols
            idols={currentRound.items as IdolItem[]}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            activeCriterion={currentRound.activeCriterion}
            onChoose={(id, ms) => choose(id, ms)}
            onTimeout={timeout}
          />
        )}

        {/* Contenu du round chansons */}
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
            //onPass={(ms) => pass(ms)}
            onTimeout={timeout}
          />
        )}

        {/* Espace vide pendant les transitions (maintient le layout stable) */}
        {!isPlaying && phase !== 'summary' && <div className={g.transitionBlank} />}
      </main>
      {/* Overlays de transition — EN DEHORS de <main> pour ne pas être clippés */}²
      {phase === 'roundTransition' && (
        <RoundTransition roundNumber={currentRoundIndex + 1} totalRounds={totalRounds} onDone={skipRoundTransition} />
      )}
      {phase === 'playerTransition' && <PlayerTransitionOverlay playerName={p2Name} onSkip={skipPlayerTransition} />}
    </div>
  )
}
