import styles from './ScrollTopControl.module.scss'

export function ScrollTopControl() {
  return (
    <button
      type="button"
      className={['btn', 'btn--ghost', 'btn--sm', styles.btn].join(' ')}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Remonter en haut"
      title="Remonter en haut"
    >
      ^
    </button>
  )
}
