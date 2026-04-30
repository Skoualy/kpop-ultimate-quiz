import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, NavLink } from 'react-router-dom'
import { useAppContext } from '@/context/AppContext'
import type { AppHeaderProps } from './AppHeader.types'
import styles from './AppHeader.module.scss'

/**
 * AppHeader — header universel, identique sur toutes les pages.
 *
 * Layout desktop : [Logo] | [centerSlot] | [rightSlot + themeBtn]
 * Layout mobile  : [Logo] | [centerSlot] | [hamburger ☰]
 *   → Le hamburger ouvre un menu dropdown avec les liens de nav + le toggle thème.
 *   → Affiché uniquement si rightSlot est fourni (pages sans nav = pas de hamburger).
 */
export function AppHeader({ centerSlot, rightSlot }: AppHeaderProps) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { theme, toggleTheme } = useAppContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef    = useRef<HTMLDivElement>(null)

  // Ferme le menu au changement de route
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Ferme le menu au clic à l'extérieur
  useEffect(() => {
    if (!menuOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  const hasNav = !!rightSlot

  return (
    <header className={styles.header}>

      {/* Gauche : logo → retour config (home) */}
      <div className={styles.left}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/')}
          title="Retour à la configuration"
        >
          <span className={styles.logoIcon}>🎵</span>
          <span className={styles.logoText}>K-Pop Ultimate Quiz</span>
        </button>
      </div>

      {/* Centre : slot dynamique */}
      <div className={styles.center}>{centerSlot}</div>

      {/* Droite desktop : rightSlot (nav) + bouton thème */}
      <div className={styles.right}>
        {rightSlot}
        <button
          type="button"
          className={styles.themeBtn}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Droite mobile : hamburger (visible uniquement si nav présente) */}
      {hasNav && (
        <div className={styles.mobileRight} ref={menuRef}>
          <button
            type="button"
            className={[styles.hamburgerBtn, menuOpen ? styles.hamburgerOpen : ''].filter(Boolean).join(' ')}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {menuOpen && (
            <nav className={styles.mobileMenu} aria-label="Menu principal">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  [styles.mobileNavLink, isActive ? styles.mobileNavLinkActive : ''].filter(Boolean).join(' ')
                }
              >
                Configuration
              </NavLink>
              <NavLink
                to="/groups"
                className={({ isActive }) =>
                  [styles.mobileNavLink, isActive ? styles.mobileNavLinkActive : ''].filter(Boolean).join(' ')
                }
              >
                📋 Gérer les artistes
              </NavLink>
              <NavLink
                to="/contributor"
                className={({ isActive }) =>
                  [styles.mobileNavLink, isActive ? styles.mobileNavLinkActive : ''].filter(Boolean).join(' ')
                }
              >
                ✦ Proposer un artiste
              </NavLink>
              <div className={styles.mobileMenuDivider} />
              <button type="button" className={styles.mobileThemeBtn} onClick={toggleTheme}>
                {theme === 'dark' ? '☀️ Thème clair' : '🌙 Thème sombre'}
              </button>
            </nav>
          )}
        </div>
      )}

    </header>
  )
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export function PageHeaderSlot({ title }: { title: string }) {
  return <span className={styles.pageTitle}>{title}</span>
}

export function ConfigHeaderSlot() {
  return (
    <nav className={styles.configNav} aria-label="Navigation principale">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          [styles.configNavLink, isActive ? styles.configNavLinkActive : ''].filter(Boolean).join(' ')
        }
      >
        Configuration
      </NavLink>
      <NavLink
        to="/groups"
        className={({ isActive }) =>
          [styles.configNavLink, isActive ? styles.configNavLinkActive : ''].filter(Boolean).join(' ')
        }
      >
        📋 Gérer les artistes
      </NavLink>
      <NavLink
        to="/contributor"
        className={({ isActive }) =>
          [styles.configNavLink, isActive ? styles.configNavLinkActive : ''].filter(Boolean).join(' ')
        }
      >
        ✦ Proposer un artiste
      </NavLink>
    </nav>
  )
}
