import { Link } from 'react-router-dom'
import styles from './Footer.module.scss'

const APP_VERSION = '0.6.1'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.copy}>© Skoualy</span>
      <span className={styles.sep} aria-hidden>
        ·
      </span>
      <span className={styles.version}>v{APP_VERSION}</span>
      <span className={styles.sep} aria-hidden>
        ·
      </span>
      <Link to="/credits" className={styles.link}>
        Crédits images
      </Link>
    </footer>
  )
}
