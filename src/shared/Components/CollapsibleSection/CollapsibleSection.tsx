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
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <button type="button" className={styles.toggleBtn} onClick={() => setOpen((prev) => !prev)}>
            {open ? '−' : '+'}
          </button>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>({subtitle})</span>}
        </div>
        <div className={styles.right}>{actions}</div>
      </div>
      {open && <div className={styles.content}>{children}</div>}
    </section>
  )
}
