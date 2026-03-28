import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  buildGamePool, getYouTubeId, getYouTubeThumbnail, shuffle,
  buildIdolMap,
} from '../services/dataService';
import type { GameItem, IdolGameItem, SongGameItem, SaveOneCriterion } from '../types';
import { StatusPill, TimerBar, useCountdown } from '../components/shared';

const CRITERION_LABELS: Record<SaveOneCriterion, string> = {
  all: 'Tous', beauty: 'Beauté', personality: 'Personnalité',
  voice: 'Voix', performance: 'Performance', leadership: 'Leadership', random: 'Aléatoire',
};

export function SaveOnePage() {
  const navigate = useNavigate();
  const { config, groups, idols } = useApp();

  // Build pool
  const pool = useMemo<GameItem[]>(() => buildGamePool(groups, idols, config), [groups, idols, config]);

  // Build rounds: each round = (drops + 1) items to choose from
  const rounds = useMemo<GameItem[][]>(() => {
    const take = Math.min(config.rounds, Math.floor(pool.length / (config.drops + 1)));
    const shuffled = [...pool];
    const result: GameItem[][] = [];
    for (let i = 0; i < take; i++) {
      result.push(shuffled.splice(0, config.drops + 1));
    }
    return result;
  }, [pool, config.rounds, config.drops]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [currentSongIdx, setCurrentSongIdx] = useState(0); // for song mode: which card is playing
  const [iframeKey, setIframeKey] = useState(0);

  const currentRound = rounds[roundIdx];
  const isIdolMode = config.category === 'idols';

  // Timer
  const timerRunning = config.timerEnabled && chosen === null;
  const { remaining: timerRemaining, pct: timerPct, reset: timerReset } = useCountdown(
    config.timerSeconds,
    timerRunning,
    () => { if (chosen === null) handlePick(null); }
  );

  const handlePick = useCallback((idx: number | null) => {
    if (chosen !== null) return;
    setChosen(idx ?? -1);
    if (idx !== null) setScore((s) => s + 1);
    setTimeout(() => {
      if (roundIdx + 1 >= rounds.length) {
        setGameOver(true);
      } else {
        setRoundIdx((r) => r + 1);
        setChosen(null);
        setCurrentSongIdx(0);
        setIframeKey((k) => k + 1);
        timerReset();
      }
    }, 1200);
  }, [chosen, roundIdx, rounds.length, timerReset]);

  const effectiveCriterion: SaveOneCriterion = config.criterion === 'random'
    ? (['beauty', 'personality', 'voice', 'performance'] as SaveOneCriterion[])[Math.floor(Math.random() * 4)]
    : config.criterion;

  if (pool.length === 0 || rounds.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state__icon">⚠️</div>
          <div className="empty-state__text">
            Pas assez d'éléments disponibles avec la configuration actuelle.<br />
            Essaie d'ajouter plus de groupes ou de changer les filtres.
          </div>
          <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>
            ← Retour config
          </button>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="game-page">
        <div className="game-status-bar">
          <StatusPill label="Mode" value={`Save one / Drop ${config.drops}`} />
          <StatusPill label="Score final" value={`${score}/${rounds.length}`} />
        </div>
        <div className="game-content flex-center" style={{ flex: 1 }}>
          <div className="round-end" style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 48 }}>🏆</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Partie terminée !</div>
            <div className="round-end__score">{score}/{rounds.length}</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {score === rounds.length ? 'Parfait 🔥' : `${rounds.length - score} passage${rounds.length - score > 1 ? 's' : ''}`}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn--primary" onClick={() => { setRoundIdx(0); setScore(0); setChosen(null); setGameOver(false); setIframeKey((k) => k + 1); }}>
                🔄 Rejouer
              </button>
              <button className="btn btn--secondary" onClick={() => navigate('/')}>← Config</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRound) return null;

  const modeLabel = `Save one / Drop ${config.drops}`;
  const categoryLabel = isIdolMode ? 'Idoles' : 'Chansons';

  return (
    <div className="game-page">
      {/* Status bar */}
      <div className="game-status-bar">
        <StatusPill label="Round" value={`${roundIdx + 1} / ${rounds.length}`} />
        <StatusPill label="Mode" value={modeLabel} />
        <StatusPill label="Catégorie" value={categoryLabel} />
        {!isIdolMode && <StatusPill label="Extrait" value={`${config.clipDuration}s`} />}
        <StatusPill label="Timer" value={config.timerEnabled ? `${timerRemaining}s` : 'Off'} />
        <StatusPill label="Score" value={`${score}/${roundIdx}`} />
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>← Config</button>
        </div>
      </div>

      {config.timerEnabled && <TimerBar pct={timerPct} />}

      <div className="game-content">
        <div className="game-title">
          {categoryLabel} — {modeLabel}
          {effectiveCriterion !== 'all' && (
            <span style={{ marginLeft: 10, fontSize: 16, fontWeight: 500, color: 'var(--accent-pink)' }}>
              · {CRITERION_LABELS[effectiveCriterion]}
            </span>
          )}
        </div>
        <div className="game-subtitle">
          {isIdolMode
            ? 'Clique sur le choix à garder — les autres sont éliminés.'
            : 'Clique sur la chanson à garder.'}
        </div>

        {isIdolMode ? (
          <IdolRound
            items={currentRound as IdolGameItem[]}
            chosen={chosen}
            onPick={handlePick}
          />
        ) : (
          <SongRound
            items={currentRound as SongGameItem[]}
            chosen={chosen}
            onPick={handlePick}
            currentSongIdx={currentSongIdx}
            setCurrentSongIdx={setCurrentSongIdx}
            iframeKey={iframeKey}
            setIframeKey={setIframeKey}
          />
        )}

        <div className="skip-area">
          <button className="btn btn--ghost btn--sm" onClick={() => handlePick(null)}>
            ⏭ Passer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Idol round ─────────────────────────────────────────────────────────────────
function IdolRound({ items, chosen, onPick }: {
  items: IdolGameItem[];
  chosen: number | null;
  onPick: (idx: number) => void;
}) {
  return (
    <div className="save-one-cards">
      {items.map((item, idx) => {
        const isPicked = chosen === idx;
        const isEliminated = chosen !== null && chosen !== idx;
        return (
          <div
            key={item.idol.id + idx}
            className="idol-card"
            style={{
              borderColor: isPicked ? 'var(--accent-pink)' : isEliminated ? 'rgba(255,255,255,0.04)' : undefined,
              opacity: isEliminated ? 0.35 : 1,
              boxShadow: isPicked ? '0 0 32px rgba(233,30,140,0.4)' : undefined,
              transition: 'all 0.3s ease',
              pointerEvents: chosen !== null ? 'none' : undefined,
            }}
            onClick={() => chosen === null && onPick(idx)}
          >
            <div className="idol-card__image">
              {item.idol.portrait ? (
                <img src={item.idol.portrait} alt={item.idol.name}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="idol-card__image-placeholder">👤</div>
              )}
            </div>
            <div className="idol-card__info">
              <div className="idol-card__name">{item.idol.name}</div>
              <div className="idol-card__group">
                {item.group.name}
                {item.memberStatus === 'former' && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 5 }}>· Ancien membre</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Song round ─────────────────────────────────────────────────────────────────
function SongRound({ items, chosen, onPick, currentSongIdx, setCurrentSongIdx, iframeKey, setIframeKey }: {
  items: SongGameItem[];
  chosen: number | null;
  onPick: (idx: number) => void;
  currentSongIdx: number;
  setCurrentSongIdx: (idx: number) => void;
  iframeKey: number;
  setIframeKey: (fn: (k: number) => number) => void;
}) {
  const current = items[currentSongIdx];
  const videoId = current ? getYouTubeId(current.song.youtubeUrl) : null;
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
    : null;

  const handleCardClick = (idx: number) => {
    if (chosen !== null) return;
    if (idx === currentSongIdx) {
      onPick(idx);
    } else {
      setCurrentSongIdx(idx);
      setIframeKey((k) => k + 1);
    }
  };

  return (
    <div className="save-one-song-layout">
      {/* Currently playing label */}
      {current && (
        <div className="current-song-title">
          🎵 {current.song.title} — {current.group.name}
        </div>
      )}

      {/* Video */}
      <div className="save-one-video">
        {embedUrl ? (
          <iframe
            key={iframeKey}
            src={embedUrl}
            title="YouTube"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)', fontSize: 36 }}>🎵</div>
        )}
      </div>

      {/* Controls */}
      <div className="save-one-song-controls">
        <span className="save-one-song-counter">{currentSongIdx + 1} / {items.length}</span>
        {items.length > 1 && (
          <button className="btn btn--ghost btn--sm"
            onClick={() => { setCurrentSongIdx((currentSongIdx + 1) % items.length); setIframeKey((k) => k + 1); }}>
            ⏭ Suivant
          </button>
        )}
      </div>

      {/* Song cards */}
      <div className="song-choices">
        {items.map((item, idx) => {
          const thumb = getYouTubeThumbnail(item.song.youtubeUrl);
          const isActive = idx === currentSongIdx;
          const isPicked = chosen === idx;
          const isEliminated = chosen !== null && chosen !== idx;
          return (
            <div
              key={item.song.id + idx}
              className={`song-card${isActive ? ' current' : ''}`}
              style={{
                opacity: isEliminated ? 0.3 : 1,
                borderColor: isPicked ? 'var(--accent-pink)' : isActive ? 'rgba(124,58,237,0.6)' : undefined,
                boxShadow: isPicked ? '0 0 24px rgba(233,30,140,0.35)' : undefined,
                transition: 'all 0.3s',
                pointerEvents: chosen !== null ? 'none' : undefined,
              }}
              onClick={() => handleCardClick(idx)}
            >
              <div className="song-card__thumb">
                {thumb ? (
                  <img src={thumb} alt={item.song.title} />
                ) : (
                  <div className="song-card__thumb-placeholder">🎵</div>
                )}
              </div>
              <div className="song-card__info">
                <div className="song-card__title">{item.song.title}</div>
                <div className="song-card__group">{item.group.name}</div>
              </div>
              <div className="song-card__replay">
                ↺ {isActive ? 'En cours' : 'Écouter'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
