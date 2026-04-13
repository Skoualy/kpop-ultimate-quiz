import { useState } from 'react'
import type { CollapsibleSectionProps } from './CollapsibleSection.types'
import styles from './CollapsibleSection.module.scss'

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
  actions,
  className = '',
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={[styles.section, className].filter(Boolean).join(' ')}>
      <div className={styles.header} onClick={() => setOpen((prev) => !prev)} role="button" tabIndex={0}>
        <div className={styles.titleWrap}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>({subtitle})</span>}
        </div>
        <div className={styles.right}>
          {actions}
          <span className={styles.caret}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && <div className={styles.content}>{children}</div>}
    </section>
  )
}
