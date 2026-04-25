import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/context/AppContext'
import type { AppHeaderProps } from './AppHeader.types'
import styles from './AppHeader.module.scss'

/**
 * Header universel — identique sur toutes les pages.
 *
 * Layout : Logo | [centerSlot] | [rightSlot] | ThemeBtn
 *
 * Usage pages normales :
 *   centerSlot = <PageHeaderSlot title="Configuration" />
 *   rightSlot  = <ConfigHeaderSlot />
 *
 * Usage pages de jeu :
 *   centerSlot = <GameCenterSlot … />
 *   rightSlot  = null
 */
export function AppHeader({ centerSlot, rightSlot }: AppHeaderProps) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAppContext()

  return (
    <header className={styles.header}>
      {/* Gauche : logo cliquable → page config (home) */}
      <div className={styles.left}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={() => navigate('/')}
          title="Retour à la configuration"
        >
          <span className={styles.logoText}>🎵 K-Pop Ultimate Quiz</span>
        </button>
      </div>

      {/* Centre : slot dynamique */}
      <div className={styles.center}>{centerSlot}</div>

      {/* Droite : slot dynamique + bouton thème */}
      <div className={styles.right}>
        {rightSlot}
        <button
          type="button"
          className={styles.themeBtn}
          onClick={() => toggleTheme()}
          title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}

// ─── Slot central : page normale ──────────────────────────────────────────────

export function PageHeaderSlot({ title }: { title: string }) {
  return <span className={styles.pageTitle}>{title}</span>
}

// ─── Slot central : jeu — back | round | action ───────────────────────────────

// ─── Slot droit : nav pages normales ─────────────────────────────────────────

import { NavLink } from 'react-router-dom'

export function ConfigHeaderSlot() {
  return (
    <nav className={styles.configNav}>
      <NavLink
        to="/"
        end
        className={({ isActive }) => [styles.configNavLink, isActive ? styles.configNavLinkActive : ''].join(' ')}
      >
        Configuration
      </NavLink>
      <NavLink
        to="/groups"
        className={({ isActive }) => [styles.configNavLink, isActive ? styles.configNavLinkActive : ''].join(' ')}
      >
        📋 Gérer les artistes
      </NavLink>
      <NavLink
        to="/contributor"
        className={({ isActive }) => [styles.configNavLink, isActive ? styles.configNavLinkActive : ''].join(' ')}
      >
        ✦ Proposer un artiste
      </NavLink>
    </nav>
  )
}
