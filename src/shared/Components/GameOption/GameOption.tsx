import styles from './GameOption.module.scss'

interface GameOptionProps {
  /** Label optionnel au-dessus/avant la valeur (ex: "Mode de jeu", "Drops") */
  labelOption?: string
  /** Valeur affichée (ex: "Personnalisé", "3", "10s") */
  optionValue: string | number
}

/**
 * Badge générique pour le GameHud.
 * Affiche [labelOption] + optionValue sur une ligne épurée.
 */
export function GameOption({ labelOption, optionValue }: GameOptionProps) {
  return (
    <div className={styles.option}>
      {labelOption && <span className={styles.label}>{labelOption}</span>}
      <span className={styles.value}>{optionValue}</span>
    </div>
  )
}
