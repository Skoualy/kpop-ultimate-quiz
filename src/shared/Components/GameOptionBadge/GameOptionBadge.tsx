import styles from './GameOptionBadge.module.scss'

interface GameOptionBadgeProps {
  /** Label optionnel au-dessus/avant la valeur (ex: "Mode de jeu", "Drops") */
  labelOption?: string
  /** Valeur affichée (ex: "Personnalisé", "3", "10s") */
  optionValue: string | number
}

/**
 * Badge générique pour le GameHud.
 * Affiche [labelOption] + optionValue sur une ligne épurée.
 */
export function GameOptionBadge({ labelOption, optionValue }: GameOptionBadgeProps) {
  return (
    <span className={styles.badge}>
      {labelOption && <span className={styles.label}>{labelOption}</span>}
      <span className={styles.value}>{optionValue}</span>
    </span>
  )
}
