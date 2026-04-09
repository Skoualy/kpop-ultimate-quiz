import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { GameProvider } from '@/context/GameContext'
import '@/styles/globals.scss'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
