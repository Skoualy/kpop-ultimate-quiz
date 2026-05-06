import { useState, useEffect, useCallback } from 'react'

export interface UseFullscreenReturn {
  isFullscreen: boolean
  toggle: () => void
}

/**
 * useFullscreen — gère l'entrée/sortie du mode plein écran natif.
 *
 * Utilise l'API Fullscreen sur `document.documentElement` pour couvrir
 * toute la fenêtre du navigateur, interface incluse.
 * Le state `isFullscreen` se synchronise avec les changements extérieurs
 * (ex: touche Échap du navigateur).
 */
export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(
    () => !!document.fullscreenElement,
  )

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Certains navigateurs refusent (iframe sans allowfullscreen, etc.)
        console.warn('[useFullscreen] requestFullscreen() refusé par le navigateur.')
      })
    } else {
      document.exitFullscreen()
    }
  }, [])

  return { isFullscreen, toggle }
}
