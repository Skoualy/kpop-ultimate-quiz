import { NavLink } from 'react-router-dom'
import { useAppContext } from '@/context/AppContext'
import type { LayoutProps, PageContainerProps } from './Layout.types'
import styles from './Layout.module.scss'

export function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useAppContext()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.headerName}>🎵 K-Pop Ultimate Quiz</span>
          <span className={styles.headerSubtitle}>© Skoualy</span>
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')
            }
          >
            Configuration
          </NavLink>
          <NavLink
            to="/groups"
            className={({ isActive }) =>
              [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')
            }
          >
            📋 Gérer les groupes
          </NavLink>
          <NavLink
            to="/contributor"
            className={({ isActive }) =>
              [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ')
            }
          >
            ✦ Proposer un groupe
          </NavLink>
        </nav>

        <button
          className={styles.themeBtn}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}

export function PageContainer({
  children, title, subtitle, actions, wide = false, className = '',
}: PageContainerProps) {
  return (
    <div className={[styles.pageContainer, wide ? styles.pageContainerWide : '', className].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderLeft}>
            {title    && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
