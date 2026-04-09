import type { ReactNode } from 'react'
import styles from './ContributorStep.module.scss'

interface ContributorStepProps {
  children: ReactNode
  errors?: string[]
}

export function ContributorStep({ children, errors }: ContributorStepProps) {
  return (
    <div className={styles.step}>
      {errors && errors.length > 0 && (
        <div className={styles.errorBox}>
          <div className={styles.errorTitle}>⚠ Champs requis manquants</div>
          {errors.map((err, i) => (
            <div key={i} className={styles.errorItem}>
              <span className={styles.errorDot}>·</span> {err}
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
