import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAppContext } from '@/context/AppContext'
import { Layout, GameShell } from '@/shared/Layout'
import ConfigPage from '@/features/config/ConfigPage'
import GroupsPage from '@/features/groups/GroupsPage'
import ContributorPage from '@/features/contributor/ContributorPage'
import BlindTestPage from '@/features/blind-test/BlindTestPage'
import SaveOnePage from '@/features/save-one/SaveOnePage'
import QuickVotePage from '@/features/quick-vote/QuickVotePage'
import CreditsPage from '@/features/credits/CreditsPage'

function AppRoutes() {
  const location  = useLocation()
  const isGamePage = location.pathname.startsWith('/game/')

  if (isGamePage) {
    return (
      <GameShell>
        <Routes>
          <Route path="/game/blind-test" element={<BlindTestPage />} />
          <Route path="/game/save-one"   element={<SaveOnePage />} />
          {/* Quick Vote — même GameShell que les autres modes */}
          <Route path="/game/quick-vote" element={<QuickVotePage />} />
        </Routes>
      </GameShell>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"                     element={<ConfigPage />} />
        <Route path="/groups"               element={<GroupsPage />} />
        <Route path="/contributor"          element={<ContributorPage />} />
        <Route path="/contributor/:groupId" element={<ContributorPage />} />
        <Route path="/credits"              element={<CreditsPage />} />
        <Route path="*"                     element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export function App() {
  const { theme } = useAppContext()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '')
  }, [theme])

  return <AppRoutes />
}
