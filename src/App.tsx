import { useState, useEffect } from 'react';
import { NavLink, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ConfigPage } from './pages/ConfigPage';
import { GroupsPage } from './pages/GroupsPage';
import { ContributorPage } from './pages/ContributorPage';
import { BlindTestPage } from './pages/BlindTestPage';
import { SaveOnePage } from './pages/SaveOnePage';

type Theme = 'dark' | 'light';

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('kpopquiz-theme') as Theme) ?? 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
    localStorage.setItem('kpopquiz-theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}

export function App() {
  const location = useLocation();
  const isGamePage = location.pathname.startsWith('/game/');
  const { theme, toggle } = useTheme();

  return (
    <div className="app-shell">
      {!isGamePage && (
        <header className="app-header">
          <div className="app-header__title">
            <span className="app-header__name">🎵 K-Pop Quiz</span>
            <span className="app-header__subtitle">© Skoualy — v0.7</span>
          </div>
          <nav className="app-header__nav">
            <NavLink to="/" end>
              Configuration
            </NavLink>
            <NavLink to="/groups">Gérer les groupes</NavLink>
            <NavLink to="/contributor">✦ Proposer un groupe</NavLink>
            <button
              onClick={toggle}
              title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
              style={{
                background: 'var(--bg-pill)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                padding: '6px 10px',
                fontSize: 16,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </nav>
        </header>
      )}

      <Routes>
        <Route path="/" element={<ConfigPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/contributor" element={<ContributorPage />} />
        <Route path="/contributor/:groupId" element={<ContributorPage />} />
        <Route path="/game/blind-test" element={<BlindTestPage />} />
        <Route path="/game/save-one" element={<SaveOnePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
