import styles from './GameOption.module.scss'

interface GameOptionProps {
  /** Icône emoji affiché à la place du label texte (ex: "⏱️") */
  icon?: string
  /** Label texte — utilisé comme tooltip accessible si icon est fourni */
  labelOption?: string
  /** Valeur affichée (ex: "15s", "3", "Off") */
  optionValue: string | number
}

/**
 * Badge générique pour le GameHud.
 *
 * - Si `icon` est fourni : affiche [icon] [valeur], label en tooltip
 * - Sinon : affiche [label] [valeur] (mode texte, rétrocompat)
 */
export function GameOption({ icon, labelOption, optionValue }: GameOptionProps) {
  return (
    <div
      className={styles.option}
      title={labelOption} // tooltip accessible sur l'icône
    >
      {icon
        ? <span className={styles.icon} aria-label={labelOption}>{icon}</span>
        : labelOption && <span className={styles.label}>{labelOption}</span>
      }
      <span className={styles.value}>{optionValue}</span>
    </div>
  )
}
