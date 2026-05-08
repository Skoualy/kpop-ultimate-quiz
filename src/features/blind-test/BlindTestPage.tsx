import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { AppHeader } from '@/shared/Layout/AppHeader'
import { GameHud } from '@/shared/Components/GameHud'
import { RoundTransition } from '@/shared/Components/RoundTransition'
import { PlayerTransitionOverlay } from '@/shared/Components/PlayerTransitionOverlay'
import { BlindTestSongs } from './components/BlindTestSongs'
import { BlindTestIdols } from './components/BlindTestIdols'
import { BlindTestSummary } from './components/BlindTestSummary'
import { useBlindTestGame } from './hooks/useBlindTestGame'
import { GAME_OPTION_ICONS, GAME_PLAY_MODE_MAP } from '@/shared/constants'
import g from '@/styles/game.module.scss'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlindTestPage() {
  const navigate = useNavigate()
  const { config } = useGameContext()

  const {
    isLoading,
    error,
    phase,
    rounds,
    results,
    currentRoundIndex,
    currentPlayer,
    timerKey,
    turnState,
    p1Score,
    p2Score,
    submitAnswer,
    reveal,
    timeout,
    pass,
    onClipEnd,
    skipPlayerTransition,
    skipRoundTransition,
    restart,
  } = useBlindTestGame(config)

  const goToConfig = useCallback(() => navigate('/'), [navigate])

  const currentRound = rounds[currentRoundIndex]
  const totalRounds  = rounds.length
  const twoPlayer    = config.twoPlayerMode
  const p1Name       = config.player1Name || 'Joueur 1'
  const p2Name       = config.player2Name || 'Joueur 2'
  const activePlayer = currentPlayer === 0 ? p1Name : p2Name
  const isPlaying    = phase === 'playing'
  const isIdols      = config.category === 'idols'
  const modeConfig   = GAME_PLAY_MODE_MAP[config.gamePlayMode]
  const isHardcore   = config.gamePlayMode === 'hardcore'

  // Score shown next to player name in the HUD
  const currentScore = twoPlayer
    ? (currentPlayer === 0 ? p1Score : p2Score)
    : p1Score

  // ── HUD options ───────────────────────────────────────────────────────────

  const hudOptions = [
    { icon: GAME_OPTION_ICONS['Type de quiz'],  labelOption: 'Type de quiz',  optionValue: 'Blind Test' },
    { icon: GAME_OPTION_ICONS['Catégorie'],     labelOption: 'Catégorie',     optionValue: isIdols ? 'Idoles' : 'Chansons' },
    { icon: GAME_OPTION_ICONS['Mode de jeu'],   labelOption: 'Mode de jeu',   optionValue: modeConfig.label },
    config.timerSeconds > 0
      ? { icon: GAME_OPTION_ICONS['Timer'], labelOption: 'Timer', optionValue: `${config.timerSeconds}s` }
      : null,
    !isIdols
      ? { icon: GAME_OPTION_ICONS['Extrait'], labelOption: 'Extrait', optionValue: `${config.clipDuration}s` }
      : null,
  ]

  // ── Loading / error ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={g.page}>
        <AppHeader />
        <div className={g.center}>
          <div className={g.spinner} />
          <p>Chargement…</p>
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
          <button className={g.retryBtn} onClick={goToConfig}>← Retour à la config</button>
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
          <button className={g.retryBtn} onClick={goToConfig}>← Retour à la config</button>
        </div>
      </div>
    )
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  if (phase === 'summary') {
    return (
      <div className={[g.page, g.pageSummary].join(' ')}>
        <AppHeader />
        <BlindTestSummary
          rounds={rounds}
          results={results}
          config={config}
          onRestart={restart}
          onBackToConfig={goToConfig}
        />
      </div>
    )
  }

  // ── Game ──────────────────────────────────────────────────────────────────

  const activeItem = currentRound
    ? (isIdols
        ? (currentPlayer === 0 ? currentRound.idol1 : currentRound.idol2)
        : (currentPlayer === 0 ? currentRound.song1 : currentRound.song2))
    : null

  return (
    <div className={g.page}>
      <main className={g.content}>
        <GameHud
          options={hudOptions}
          twoPlayer={twoPlayer}
          activePlayerName={isPlaying ? activePlayer : undefined}
          activePlayerIndex={currentPlayer as 0 | 1}
          currentScore={currentScore}
          onBack={goToConfig}
          onPass={pass}
          actionDisabled={!isPlaying}
          currentRound={currentRoundIndex + 1}
          totalRounds={totalRounds}
        />

        {/* BlindTestSongs */}
        {isPlaying && currentRound && !isIdols && activeItem?.type === 'song' && (
          <BlindTestSongs
            song={activeItem}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            turnState={turnState}
            canReplay={modeConfig.canReplay}
            canReveal={!isHardcore}
            onSubmit={submitAnswer}
            onReveal={reveal}
            onTimeout={timeout}
            onClipEnd={onClipEnd}
          />
        )}

        {/* BlindTestIdols */}
        {isPlaying && currentRound && isIdols && activeItem?.type === 'idol' && (
          <BlindTestIdols
            idol={activeItem}
            timerSeconds={config.timerSeconds}
            timerKey={timerKey}
            turnState={turnState}
            canReveal={!isHardcore}
            onSubmit={submitAnswer}
            onReveal={reveal}
            onTimeout={timeout}
          />
        )}

        {!isPlaying && <div className={g.transitionBlank} />}
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
