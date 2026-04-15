import { useEffect, useState } from 'react'
import styles from './ScrollTopControl.module.scss'

interface ScrollTopControlProps {
  /** Élément scrollable à surveiller. null/undefined = window. */
  scrollTarget?: HTMLElement | null
  /** Seuil en px avant affichage du bouton (défaut: 200) */
  threshold?: number
}

export function ScrollTopControl({ scrollTarget, threshold = 200 }: ScrollTopControlProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = scrollTarget ?? window

    function handleScroll() {
      const scrollY = scrollTarget ? scrollTarget.scrollTop : window.scrollY
      setVisible(scrollY > threshold)
    }

    target.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => target.removeEventListener('scroll', handleScroll)
  }, [scrollTarget, threshold])

  const handleClick = () => {
    if (scrollTarget) scrollTarget.scrollTo({ top: 0, behavior: 'smooth' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      type="button"
      className={['btn', 'btn--ghost', 'btn--sm', styles.btn].join(' ')}
      onClick={handleClick}
      aria-label="Remonter en haut"
      title="Remonter en haut"
    >
      ↑
    </button>
  )
}
