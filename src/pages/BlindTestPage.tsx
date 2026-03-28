import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { buildGamePool, getYouTubeId, getYouTubeThumbnail, shuffle } from '../services/dataService';
import type { SongGameItem } from '../types';
import { StatusPill, TimerBar, useCountdown } from '../components/shared';

export function BlindTestPage() {
  const navigate = useNavigate();
  const { config, groups, idols } = useApp();

  // Build song pool (blind test is always songs)
  const pool = useMemo<SongGameItem[]>(() => {
    const songConfig = { ...config, category: 'songs' as const };
    return buildGamePool(groups, idols, songConfig) as SongGameItem[];
  }, [groups, idols, config]);

  const rounds = useMemo(() => {
    const take = Math.min(config.rounds, pool.length);
    return pool.slice(0, take);
  }, [pool, config.rounds]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const current = rounds[roundIdx] as SongGameItem | undefined;

  const goNext = useCallback(() => {
    if (roundIdx + 1 >= rounds.length) {
      setGameOver(true);
    } else {
      setRoundIdx((i) => i + 1);
      setAnswer('');
      setRevealed(false);
      setIsCorrect(null);
      setIsPlaying(true);
      setIframeKey((k) => k + 1);
      timerReset();
    }
  }, [roundIdx, rounds.length]);

  // Timer
  const timerRunning = config.timerEnabled && isPlaying && !revealed;
  const { remaining: timerRemaining, pct: timerPct, reset: timerReset } = useCountdown(
    config.timerSeconds,
    timerRunning,
    () => { if (!revealed) handleReveal(); }
  );

  if (pool.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state__icon">🎵</div>
          <div className="empty-state__text">
            Aucune chanson disponible avec la configuration actuelle.
            <br />Vérifie que les groupes sélectionnés ont des chansons.
          </div>
          <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>
            ← Retour config
          </button>
        </div>
      </div>
    );
  }

  const checkAnswer = (ans: string): boolean => {
    if (!current) return false;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const userNorm = normalize(ans);
    const titleNorm = normalize(current.song.title);
    const groupNorm = normalize(current.group.name);
    return userNorm.length > 0 && (userNorm === titleNorm || userNorm.includes(titleNorm) || titleNorm.includes(userNorm));
  };

  const handleValidate = () => {
    if (revealed) return;
    const ok = checkAnswer(answer);
    setIsCorrect(ok);
    if (ok) setScore((s) => s + 1);
    setRevealed(true);
    setIsPlaying(false);
  };

  const handleReveal = () => {
    setRevealed(true);
    setIsPlaying(false);
    setIsCorrect(false);
  };

  const handleReplay = () => {
    setIframeKey((k) => k + 1);
    setIsPlaying(true);
  };

  if (gameOver) {
    return (
      <div className="game-page">
        <div className="game-status-bar">
          <StatusPill label="Mode" value="Blind test" />
          <StatusPill label="Score final" value={`${score}/${rounds.length}`} />
        </div>
        <div className="game-content flex-center" style={{ flex: 1 }}>
          <div className="round-end" style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Partie terminée !</div>
            <div className="round-end__score">{score}/{rounds.length}</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {score === rounds.length ? 'Score parfait 🔥' : score > rounds.length / 2 ? 'Bien joué !' : 'Continue à t\'entraîner !'}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn--primary" onClick={() => { setRoundIdx(0); setScore(0); setAnswer(''); setRevealed(false); setIsCorrect(null); setIsPlaying(true); setIframeKey((k)=>k+1); setGameOver(false); }}>
                🔄 Rejouer
              </button>
              <button className="btn btn--secondary" onClick={() => navigate('/')}>
                ← Config
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const videoId = getYouTubeId(current.song.youtubeUrl);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
    : null;
  const thumb = getYouTubeThumbnail(current.song.youtubeUrl);

  return (
    <div className="game-page">
      {/* Status bar */}
      <div className="game-status-bar">
        <StatusPill label="Round" value={`${roundIdx + 1} / ${rounds.length}`} />
        <StatusPill label="Mode" value="Blind test" />
        <StatusPill label="Catégorie" value="Chansons" />
        <StatusPill label="Extrait" value={`${config.clipDuration}s`} />
        <StatusPill label="Timer" value={config.timerEnabled ? `${timerRemaining}s` : 'Off'} />
        <StatusPill label="Score" value={`${score}/${roundIdx}`} />
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>← Config</button>
        </div>
      </div>

      {config.timerEnabled && (
        <TimerBar pct={timerPct} />
      )}

      <div className="game-content">
        <div className="game-title">Chansons — Blind test</div>
        <div className="game-subtitle">Tape ta réponse puis valide.</div>

        <div className="blind-test-layout">
          <div>
            {/* Video area */}
            {embedUrl && isPlaying ? (
              <div className="video-area">
                <iframe
                  key={iframeKey}
                  src={embedUrl}
                  title="YouTube"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="video-area">
                {thumb ? (
                  <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                ) : (
                  <div className="video-area__placeholder">🎵</div>
                )}
              </div>
            )}

            {/* Playback controls */}
            <div className="playback-controls">
              <button className={`playback-btn${isPlaying ? ' active' : ''}`}
                onClick={() => setIsPlaying((p) => !p)} title="Pause/Play">
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button className="playback-btn" onClick={handleReplay} title="Rejouer">↺</button>
              <button className="playback-btn" onClick={handleReveal} title="Arrêter">⏹</button>
              <button className="playback-btn" onClick={goNext} title="Passer">⏭</button>
            </div>

            {/* Answer panel */}
            <div className="answer-panel">
              <input
                className="input"
                placeholder="Ta réponse…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !revealed) handleValidate(); }}
                disabled={revealed}
              />
              <div className="answer-buttons">
                <button
                  className="btn btn--primary"
                  onClick={handleValidate}
                  disabled={revealed || !answer.trim()}
                >
                  Valider
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={revealed ? goNext : handleReveal}
                >
                  {revealed ? 'Suivant →' : 'Révéler'}
                </button>
              </div>

              {revealed && (
                <div className="answer-reveal">
                  {isCorrect === true ? '✅ Bonne réponse ! ' : '❌ '}
                  Réponse : <span>{current.song.title}</span> · <span>{current.group.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Reveal card (sidebar) */}
          {revealed && (
            <div className="reveal-card">
              {thumb && (
                <div className="reveal-card__thumb">
                  <img src={thumb} alt={current.song.title} />
                </div>
              )}
              <div className="reveal-card__title">{current.song.title}</div>
              <div className="reveal-card__group">{current.group.name}</div>
              {current.song.language && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {current.song.language === 'jp' ? '🇯🇵 Japonais' : '🇺🇸 Anglais'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
