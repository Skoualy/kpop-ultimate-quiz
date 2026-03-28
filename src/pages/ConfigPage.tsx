import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Group, QuizMode, QuizCategory, SaveOneCriterion, MemberRole, SongType, Generation } from '../types';

// Helper: gender icon for display
function genIcon(g: Group) {
  return g.category === 'girlGroup' || g.category === 'femaleSoloist' ? '♀' : '♂';
}

const GENERATIONS: ('all' | Generation)[] = ['all', '1', '2', '3', '4', '5'];
const CATEGORIES_FILTER = ['all', 'girlGroup', 'boyGroup', 'soloist'] as const;
type CategoryFilter = (typeof CATEGORIES_FILTER)[number];

interface FilterState {
  search: string;
  gen: 'all' | Generation;
  categoryFilter: CategoryFilter;
}

export function ConfigPage() {
  const navigate = useNavigate();
  const { config, setConfig, resetConfig, groups } = useApp();

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    gen: 'all',
    categoryFilter: 'all',
  });

  // ─── Group selector logic ─────────────────────────────────────────────────────
  const availableGroups = useMemo(() => {
    return groups.filter((g) => !config.selectedGroupIds.includes(g.id));
  }, [groups, config.selectedGroupIds]);

  const selectedGroups = useMemo(() => {
    return config.selectedGroupIds.map((id) => groups.find((g) => g.id === id)).filter(Boolean) as Group[];
  }, [groups, config.selectedGroupIds]);

  const filteredAvailable = useMemo(() => {
    return availableGroups.filter((g) => {
      if (filters.search && !g.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.gen !== 'all' && g.generation !== filters.gen) return false;
      if (filters.categoryFilter === 'girlGroup' && g.category !== 'girlGroup') return false;
      if (filters.categoryFilter === 'boyGroup' && g.category !== 'boyGroup') return false;
      if (filters.categoryFilter === 'soloist' && g.category !== 'femaleSoloist' && g.category !== 'maleSoloist') return false;
      return true;
    });
  }, [availableGroups, filters]);

  const [selectedAvail, setSelectedAvail] = useState<Set<string>>(new Set());
  const [selectedChosen, setSelectedChosen] = useState<Set<string>>(new Set());

  const moveRight = () => {
    const ids = [...selectedAvail];
    setConfig({
      selectedGroupIds: [...config.selectedGroupIds, ...ids.filter((id) => !config.selectedGroupIds.includes(id))],
    });
    setSelectedAvail(new Set());
  };

  const moveAllRight = () => {
    const ids = filteredAvailable.map((g) => g.id);
    setConfig({
      selectedGroupIds: [...config.selectedGroupIds, ...ids.filter((id) => !config.selectedGroupIds.includes(id))],
    });
    setSelectedAvail(new Set());
  };

  const moveLeft = () => {
    const ids = [...selectedChosen];
    setConfig({ selectedGroupIds: config.selectedGroupIds.filter((id) => !ids.includes(id)) });
    setSelectedChosen(new Set());
  };

  const moveAllLeft = () => {
    setConfig({ selectedGroupIds: [] });
    setSelectedChosen(new Set());
  };

  const canLaunch = config.selectedGroupIds.length > 0;

  const launch = () => {
    if (!canLaunch) return;
    if (config.mode === 'blindTest') navigate('/game/blind-test');
    else navigate('/game/save-one');
  };

  // ─── Criterion / role visibility ──────────────────────────────────────────────
  const isSaveOne = config.mode === 'saveOne';
  const isIdols = config.category === 'idols';
  const isBlindTest = config.mode === 'blindTest';

  const MEMBER_ROLES: MemberRole[] = [
    'leader',
    'mainVocal',
    'vocal',
    'mainDancer',
    'dancer',
    'mainRapper',
    'rapper',
    'visual',
    'maknae',
  ];
  const ROLE_LABELS: Record<string, string> = {
    leader: 'Leader',
    mainVocal: 'Main Vocal',
    vocal: 'Vocal',
    mainDancer: 'Main Dancer',
    dancer: 'Dancer',
    mainRapper: 'Main Rapper',
    rapper: 'Rapper',
    visual: 'Visual',
    maknae: 'Maknae',
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header__left">
          <h1>Configuration</h1>
          <p>Choisis une config, elle sera gardée en mémoire automatiquement.</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--ghost btn--sm" onClick={resetConfig}>
            Reset
          </button>
        </div>
      </div>

      {/* Config grid */}
      <div className="config-grid">
        {/* Quiz type */}
        <div className="config-card">
          <div className="config-card__title">Type de quiz</div>
          <select className="select" value={config.mode} onChange={(e) => setConfig({ mode: e.target.value as QuizMode })}>
            <option value="saveOne">Save one</option>
            <option value="blindTest">Blind test</option>
          </select>
        </div>

        {/* Drops (Save One only) */}
        {isSaveOne && (
          <div className="config-card">
            <div className="config-card__title">Drops (1–4)</div>
            <input
              type="number"
              className="input"
              min={1}
              max={4}
              value={config.drops}
              onChange={(e) => setConfig({ drops: Math.max(1, Math.min(4, parseInt(e.target.value) || 1)) })}
            />
            <div className="config-card__hint">{config.drops + 1} choix par round</div>
          </div>
        )}

        {/* Category */}
        <div className="config-card">
          <div className="config-card__title">Catégorie</div>
          <select
            className="select"
            value={config.category}
            onChange={(e) => setConfig({ category: e.target.value as QuizCategory })}
          >
            <option value="idols">Idoles</option>
            <option value="songs">Chansons</option>
          </select>
        </div>

        {/* Criterion (Save One + Idols only) */}
        {isSaveOne && isIdols && (
          <div className="config-card">
            <div className="config-card__title">Critère</div>
            <select
              className="select"
              value={config.criterion}
              onChange={(e) => setConfig({ criterion: e.target.value as SaveOneCriterion })}
            >
              <option value="all">Tous</option>
              <option value="beauty">Beauté</option>
              <option value="personality">Personnalité</option>
              <option value="voice">Voix</option>
              <option value="performance">Performance</option>
              <option value="leadership">Leadership</option>
              <option value="random">Aléatoire</option>
            </select>
          </div>
        )}

        {/* Song type (songs category) */}
        {config.category === 'songs' && (
          <div className="config-card">
            <div className="config-card__title">Type de chanson</div>
            <select
              className="select"
              value={config.songType}
              onChange={(e) => setConfig({ songType: e.target.value as SongType })}
            >
              <option value="all">Tous</option>
              <option value="titles">Titles</option>
              <option value="bSides">B-sides</option>
            </select>
            <div className="config-card__hint">Titles, B-sides ou aléatoire.</div>
          </div>
        )}

        {/* Role filter (Save One + Idols) */}
        {isSaveOne && isIdols && (
          <div className="config-card">
            <div className="config-card__title">Rôle</div>
            <select
              className="select"
              value={config.roleFilter}
              onChange={(e) => setConfig({ roleFilter: e.target.value as MemberRole | 'all' })}
            >
              <option value="all">Tous les rôles</option>
              {MEMBER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <div className="config-card__hint">Filtre les idoles par rôle.</div>
          </div>
        )}

        {/* Rounds */}
        <div className="config-card">
          <div className="config-card__title">Rounds</div>
          <input
            type="number"
            className="input"
            min={1}
            max={100}
            value={config.rounds}
            onChange={(e) => setConfig({ rounds: Math.max(1, parseInt(e.target.value) || 1) })}
          />
        </div>

        {/* Timer */}
        <div className="config-card">
          <div className="config-card__title">Timer (secondes)</div>
          <input
            type="number"
            className="input"
            min={5}
            max={120}
            value={config.timerSeconds}
            onChange={(e) => setConfig({ timerSeconds: Math.max(5, parseInt(e.target.value) || 10) })}
          />
          <label className="checkbox-row" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={config.timerEnabled}
              onChange={(e) => setConfig({ timerEnabled: e.target.checked })}
            />
            Activer
          </label>
        </div>

        {/* Clip duration (Blind Test) */}
        {isBlindTest && (
          <div className="config-card">
            <div className="config-card__title">Durée des extraits</div>
            <select
              className="select"
              value={config.clipDuration}
              onChange={(e) => setConfig({ clipDuration: parseInt(e.target.value) })}
            >
              {[5, 10, 15, 20, 30].map((s) => (
                <option key={s} value={s}>
                  {s} sec
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 2-player mode */}
        <div className="config-card">
          <div className="config-card__title">Mode 2 joueurs</div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={config.twoPlayerMode}
              onChange={(e) => setConfig({ twoPlayerMode: e.target.checked })}
            />
            Activer
          </label>
        </div>

        {/* Player names (2-player) */}
        {config.twoPlayerMode && (
          <div className="config-card" style={{ gridColumn: 'span 2' }}>
            <div className="config-card__title">Pseudos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input
                className="input"
                value={config.player1Name}
                onChange={(e) => setConfig({ player1Name: e.target.value })}
                placeholder="Joueur 1"
              />
              <input
                className="input"
                value={config.player2Name}
                onChange={(e) => setConfig({ player2Name: e.target.value })}
                placeholder="Joueur 2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Group selector */}
      <div className="group-selector">
        <div className="group-selector__header">
          <div className="group-selector__title">Groupes</div>
          <span className="group-selector__count">
            — {config.selectedGroupIds.length} sélectionné
            {config.selectedGroupIds.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="group-selector__filters">
          <input
            className="input group-selector__search"
            style={{ maxWidth: 320 }}
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          {(['all', '1', '2', '3', '4', '5'] as const).map((g) => (
            <button
              key={g}
              className={`pill pill--filter${filters.gen === g ? ' selected' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, gen: g }))}
            >
              {g === 'all' ? 'Toutes gen.' : `Gen ${g}`}
            </button>
          ))}
          <button
            className={`pill pill--filter${filters.categoryFilter === 'all' ? ' selected' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, categoryFilter: 'all' }))}
          >
            Tout
          </button>
          <button
            className={`pill pill--filter${filters.categoryFilter === 'girlGroup' ? ' selected' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, categoryFilter: 'girlGroup' }))}
          >
            Girl groups
          </button>
          <button
            className={`pill pill--filter${filters.categoryFilter === 'boyGroup' ? ' selected' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, categoryFilter: 'boyGroup' }))}
          >
            Boy groups
          </button>
        </div>

        {/* Dual list */}
        <div className="group-selector__dual">
          {/* Available */}
          <div>
            <div className="group-list__header">Disponibles ({filteredAvailable.length})</div>
            <div className="group-list">
              {filteredAvailable.map((g) => (
                <div
                  key={g.id}
                  className={`group-list__item${selectedAvail.has(g.id) ? ' selected' : ''}`}
                  style={{
                    background: selectedAvail.has(g.id) ? 'rgba(124,58,237,0.12)' : undefined,
                  }}
                  onClick={() => {
                    setSelectedAvail((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.id)) next.delete(g.id);
                      else next.add(g.id);
                      return next;
                    });
                  }}
                  onDoubleClick={() => {
                    setConfig({ selectedGroupIds: [...config.selectedGroupIds, g.id] });
                    setSelectedAvail(new Set());
                  }}
                >
                  <span className="group-list__item-name">{g.name}</span>
                  <span className="group-list__item-meta">
                    {genIcon(g)} Gen{g.generation}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="group-selector__controls">
            <button className="group-selector__ctrl-btn" title="Tout ajouter" onClick={moveAllRight}>
              »
            </button>
            <button className="group-selector__ctrl-btn" title="Ajouter" onClick={moveRight}>
              ›
            </button>
            <button className="group-selector__ctrl-btn" title="Retirer" onClick={moveLeft}>
              ‹
            </button>
            <button className="group-selector__ctrl-btn" title="Tout retirer" onClick={moveAllLeft}>
              «
            </button>
          </div>

          {/* Selected */}
          <div>
            <div className="group-list__header">Sélectionnés ({selectedGroups.length})</div>
            <div className="group-list">
              {selectedGroups.map((g) => (
                <div
                  key={g.id}
                  className={`group-list__item${selectedChosen.has(g.id) ? ' selected' : ''}`}
                  style={{
                    background: selectedChosen.has(g.id) ? 'rgba(124,58,237,0.12)' : undefined,
                  }}
                  onClick={() => {
                    setSelectedChosen((prev) => {
                      const next = new Set(prev);
                      if (next.has(g.id)) next.delete(g.id);
                      else next.add(g.id);
                      return next;
                    });
                  }}
                  onDoubleClick={() => {
                    setConfig({
                      selectedGroupIds: config.selectedGroupIds.filter((id) => id !== g.id),
                    });
                    setSelectedChosen(new Set());
                  }}
                >
                  <span className="group-list__item-name">{g.name}</span>
                  <span className="group-list__item-meta">
                    {genIcon(g)} Gen{g.generation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Launch */}
      <div className="config-launch">
        <button className="btn btn--primary btn--lg" onClick={launch} disabled={!canLaunch}>
          ▶ Lancer la partie
        </button>
        {!canLaunch && (
          <span style={{ marginLeft: 14, fontSize: 13, color: 'var(--text-muted)' }}>Sélectionne au moins un groupe</span>
        )}
      </div>
    </div>
  );
}
