import type { LayoutProps, PageContainerProps } from './Layout.types'
import { AppHeader, ConfigHeaderSlot } from './AppHeader'
import { Footer } from './Footer'
import styles from './Layout.module.scss'

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.shell}>
      <AppHeader rightSlot={<ConfigHeaderSlot />} />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  )
}

export function PageContainer({
  children,
  title,
  subtitle,
  actions,
  wide = false,
  className = '',
}: PageContainerProps) {
  return (
    <div className={[styles.pageContainer, wide ? styles.pageContainerWide : '', className].filter(Boolean).join(' ')}>
      {(title || actions) && (
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderLeft}>
            {title && <h1>{title}</h1>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className={styles.pageHeaderActions}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
