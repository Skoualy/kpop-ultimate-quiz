import { NavLink, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ConfigPage } from './pages/ConfigPage';
import { GroupsPage } from './pages/GroupsPage';
import { ContributorPage } from './pages/ContributorPage';
import { BlindTestPage } from './pages/BlindTestPage';
import { SaveOnePage } from './pages/SaveOnePage';

export function App() {
  const location = useLocation();
  const isGamePage =
    location.pathname.startsWith('/game/');

  return (
    <div className="app-shell">
      {/* Header */}
      {!isGamePage && (
        <header className="app-header">
          <div className="app-header__title">
            <span className="app-header__name">🎵 K-Pop Quiz</span>
            <span className="app-header__subtitle">© Skoualy — v0.7</span>
          </div>
          <nav className="app-header__nav">
            <NavLink to="/" end>Configuration</NavLink>
            <NavLink to="/groups">Gérer les groupes</NavLink>
            <NavLink to="/contributor">✦ Proposer un groupe</NavLink>
          </nav>
        </header>
      )}

      {/* Routes */}
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
