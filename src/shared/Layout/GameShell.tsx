import type { ReactNode } from 'react'

interface GameShellProps {
  children: ReactNode
}

/**
 * Shell minimaliste pour les pages de jeu.
 * Pas de header de navigation — juste le fond et le conteneur plein écran.
 */
export function GameShell({ children }: GameShellProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}
