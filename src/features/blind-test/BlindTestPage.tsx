import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '@/context/GameContext'
import { AppHeader } from '@/shared/Layout/AppHeader'
import { GameHud } from '@/shared/Components/GameHud'
import { TimerBar } from '@/shared/Components/TimerBar'
import { RoundTransition } from '@/shared/Components/RoundTransition'
import { PlayerTransitionOverlay } from '@/shared/Components/PlayerTransitionOverlay'
import { Badge } from '@/shared/PureComponents/Badge'
import { AnswerInput } from '@/shared/Controls/AnswerInput'
import { useGameTimer } from '@/shared/hooks/useGameTimer'
import { GAME_OPTION_ICONS, GAME_PLAY_MODE_MAP } from '@/shared/constants'
import { SpinningDisc } from './components/SpinningDisc'
import { BlindTestSummary } from './components/BlindTestSummary'
import { useBlindTestGame } from './hooks/useBlindTestGame'
import g from '@/styles/game.module.scss'
import styles from './BlindTestPage.module.scss'

// ─── Badges de réponse ────────────────────────────────────────────────────────

function AnswerBadges({
  artistMatched,
  titleMatched,
  isRevealed,
  artistName,
  songTitle,
}: {
  artistMatched: boolean
  titleMatched:  boolean
  isRevealed:    boolean
  artistName:    string
  songTitle:     string
}) {
  const artistLabel = artistMatched
    ? `Artiste : ${artistName} ✅`
    : isRevealed
    ? `Artiste : ${artistName} ❌`
    : 'Artiste : ???'

  const titleLabel = titleMatched
    ? `Titre : ${songTitle} ✅`
    : isRevealed
    ? `Titre : ${songTitle} ❌`
    : 'Titre : ???'

  const artistVariant = artistMatched ? 'success' : isRevealed ? 'danger' : 'default'
  const titleVariant  = titleMatched  ? 'success' : isRevealed ? 'danger' : 'default'

  return (
    <div className={styles.badges}>
      <Badge variant={artistVariant}>{artistLabel}</Badge>
      <Badge variant={titleVariant}>{titleLabel}</Badge>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlindTestPage() {
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
    turnState,
    submitAnswer,
    reveal,
    pass,
    timeout,
    onClipEnd,
    skipPlayerTransition,
    skipRoundTransition,
    restart,
  } = useBlindTestGame(config)

  const [lastInputResult, setLastInputResult] = useState<'correct' | 'wrong' | null>(null)

  const goToConfig = useCallback(() => navigate('/'), [navigate])

  const currentRound = rounds[currentRoundIndex]
  const twoPlayer    = config.twoPlayerMode
  const p1Name       = config.player1Name || 'Joueur 1'
  const p2Name       = config.player2Name || 'Joueur 2'
  const activePlayer = currentPlayer === 0 ? p1Name : p2Name
  const isPlaying    = phase === 'playing'

  const playModeConfig = GAME_PLAY_MODE_MAP[config.gamePlayMode]
  const canReplay  = playModeConfig.canReplay
  const canReveal  = config.gamePlayMode !== 'hardcore'

  // Timer (actif uniquement pendant la phase playing et non révélée)
  const { remaining, percentLeft } = useGameTimer({
    totalSeconds: !turnState.isRevealed && isPlaying ? config.timerSeconds : 0,
    active:       isPlaying && !turnState.isRevealed && !(turnState.artistMatched && turnState.titleMatched),
    onTimeout:    timeout,
    resetKey:     timerKey,
  })

  // ── Options HUD ─────────────────────────────────────────────────────────────

  const hudOptions = [
    { icon: GAME_OPTION_ICONS['Type de quiz'], labelOption: 'Type de quiz', optionValue: 'Blind Test' },
    { icon: GAME_OPTION_ICONS['Mode de jeu'],  labelOption: 'Mode de jeu',  optionValue: playModeConfig.label },
    config.timerSeconds > 0
      ? { icon: GAME_OPTION_ICONS['Timer'], labelOption: 'Timer', optionValue: `${config.timerSeconds}s` }
      : null,
    { icon: GAME_OPTION_ICONS['Extrait'], labelOption: 'Extrait', optionValue: `${config.clipDuration}s` },
  ]

  // ── Soumission réponse ───────────────────────────────────────────────────────

  function handleSubmit(value: string) {
    const result = submitAnswer(value)
    setLastInputResult(result)
    // Réinitialise pour permettre de re-déclencher le feedback sur la même réponse
    setTimeout(() => setLastInputResult(null), 50)
  }

  // ── Chargement ───────────────────────────────────────────────────────────────

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
          <button className={g.retryBtn} onClick={() => navigate('/')}>← Config</button>
        </div>
      </div>
    )
  }

  // ── Résumé ───────────────────────────────────────────────────────────────────

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

  // ── Round transition ─────────────────────────────────────────────────────────

  if (phase === 'roundTransition') {
    return (
      <div className={g.page}>
        <AppHeader />
        <div className={g.transitionBlank} />
        <RoundTransition
          roundNumber={(currentRound?.roundNumber ?? currentRoundIndex + 1)}
          totalRounds={rounds.length}
          onDone={skipRoundTransition}
        />
      </div>
    )
  }

  // ── Transition joueur ────────────────────────────────────────────────────────

  if (phase === 'playerTransition') {
    return (
      <div className={g.page}>
        <AppHeader />
        <div className={g.transitionBlank} />
        <PlayerTransitionOverlay
          playerName={p2Name}
          onSkip={skipPlayerTransition}
        />
      </div>
    )
  }

  // ── Phase de jeu ────────────────────────────────────────────────────────────

  if (!currentRound) return null

  const currentSong = currentPlayer === 0 ? currentRound.song1 : (currentRound.song2 ?? currentRound.song1)
  const roundComplete = turnState.artistMatched && turnState.titleMatched

  return (
    <div className={g.page}>
      <AppHeader />

      <GameHud
        options={hudOptions}
        onBack={goToConfig}
        onPass={pass}
        actionDisabled={false}
        currentRound={currentRound.roundNumber}
        totalRounds={rounds.length}
        twoPlayer={twoPlayer}
        activePlayerName={twoPlayer ? activePlayer : undefined}
        activePlayerIndex={currentPlayer}
      />

      <div className={g.content}>
        {/* Bloc média central */}
        <SpinningDisc
          song={currentSong}
          isRevealed={turnState.isRevealed}
          canReplay={canReplay && !turnState.isRevealed}
          timerKey={timerKey}
          onClipEnd={onClipEnd}
        />

        {/* TimerBar */}
        {config.timerSeconds > 0 && !turnState.isRevealed && (
          <TimerBar
            percentLeft={roundComplete ? 100 : percentLeft}
            remainingSeconds={roundComplete ? config.timerSeconds : remaining}
            totalSeconds={config.timerSeconds}
            className={styles.timerBar}
          />
        )}

        {/* Badges artiste / titre */}
        <AnswerBadges
          artistMatched={turnState.artistMatched}
          titleMatched={turnState.titleMatched}
          isRevealed={turnState.isRevealed}
          artistName={currentSong.groupName}
          songTitle={currentSong.title}
        />

        {/* Input de réponse */}
        {!turnState.isRevealed && !roundComplete && (
          <AnswerInput
            onSubmit={handleSubmit}
            lastResult={lastInputResult}
            disabled={turnState.isRevealed || roundComplete}
          />
        )}

        {/* Bouton Révéler (si mode le permet et non encore révélé) */}
        {canReveal && !turnState.isRevealed && !roundComplete && (
          <button type="button" className={styles.revealBtn} onClick={reveal}>
            Révéler la réponse
          </button>
        )}
      </div>
    </div>
  )
}
