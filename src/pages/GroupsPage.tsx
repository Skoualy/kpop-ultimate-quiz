import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Group, Generation } from '../types';
import { CategoryBadge, StatusBadge } from '../components/shared';
import { getMemberCountLabel, getSongCountLabel } from '../services/dataService';

export function GroupsPage() {
  const navigate = useNavigate();
  const { groups } = useApp();

  const [search, setSearch] = useState('');
  const [genFilter, setGenFilter] = useState<'all' | Generation>('all');
  const [catFilter, setCatFilter] = useState<'all' | 'girlGroup' | 'boyGroup' | 'soloist'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())
        && !g.company.toLowerCase().includes(search.toLowerCase())
        && !(g.fandomName?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (genFilter !== 'all' && g.generation !== genFilter) return false;
      if (catFilter === 'girlGroup' && g.category !== 'girlGroup') return false;
      if (catFilter === 'boyGroup' && g.category !== 'boyGroup') return false;
      if (catFilter === 'soloist' && g.category !== 'femaleSoloist' && g.category !== 'maleSoloist') return false;
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      return true;
    });
  }, [groups, search, genFilter, catFilter, statusFilter]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header__left">
          <h1>📋 Gestion des groupes</h1>
          <p>Clique sur un groupe pour modifier ses informations dans le formulaire.</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => navigate('/contributor')}>
            ✦ Nouveau groupe
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="groups-search">
        <input
          className="input"
          placeholder="Rechercher un groupe, label, fandom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="groups-filters">
        <div className="groups-filter-row">
          {(['all', 'girlGroup', 'boyGroup', 'soloist'] as const).map((c) => (
            <button
              key={c}
              className={`pill pill--filter${catFilter === c ? ' selected' : ''}`}
              onClick={() => setCatFilter(c)}
            >
              {c === 'all' ? 'Tous' : c === 'girlGroup' ? '♀ Girl groups' : c === 'boyGroup' ? '♂ Boy groups' : 'Soloistes'}
            </button>
          ))}
          <div style={{ marginLeft: 8 }}>
            {(['all', '1', '2', '3', '4', '5'] as const).map((g) => (
              <button
                key={g}
                className={`pill pill--filter${genFilter === g ? ' selected' : ''}`}
                style={{ marginRight: 6 }}
                onClick={() => setGenFilter(g)}
              >
                {g === 'all' ? 'Toutes gen.' : `Gen ${g}`}
              </button>
            ))}
          </div>
        </div>
        <div className="groups-filter-row">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              className={`pill pill--filter${statusFilter === s ? ' selected' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'Tous statuts' : s === 'active' ? 'Actifs' : 'Inactifs'}
            </button>
          ))}
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
            {filtered.length} groupe{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="groups-grid">
        {filtered.map((g) => (
          <GroupCard key={g.id} group={g} onEdit={() => navigate(`/contributor/${g.id}`)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__text">Aucun groupe trouvé</div>
        </div>
      )}
    </div>
  );
}

function GroupCard({ group: g, onEdit }: { group: Group; onEdit: () => void }) {
  const catCls = g.category === 'girlGroup' ? 'badge--girl'
    : g.category === 'boyGroup' ? 'badge--boy' : 'badge--soloist';

  return (
    <div className="group-card">
      <div className="group-card__header">
        <div className="group-card__name">{g.name}</div>
        <div className="group-card__badges">
          <CategoryBadge category={g.category} />
          <StatusBadge status={g.status} />
          {g.parentGroupId && <span className="badge badge--subunit">Sub-unit</span>}
        </div>
      </div>

      <div className="group-card__meta">
        <span>📅 {g.debutYear} · Gen {g.generation}</span>
        <span>🏢 {g.company}</span>
      </div>

      {g.fandomName && (
        <div className="group-card__fandom">
          <span>💜</span>
          <span>{g.fandomName}</span>
        </div>
      )}

      {g.parentGroupId && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Sub-unit de : <span style={{ color: 'var(--text-secondary)' }}>{g.parentGroupId}</span>
        </div>
      )}

      <div className="group-card__stats">
        <span>👤 {getMemberCountLabel(g)}</span>
        <span>🎵 {getSongCountLabel(g)}</span>
      </div>

      <button className="btn btn--primary btn--sm" onClick={onEdit}>
        ✏️ Modifier
      </button>
    </div>
  );
}
