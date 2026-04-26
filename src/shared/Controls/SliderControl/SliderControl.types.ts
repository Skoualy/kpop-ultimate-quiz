export interface SliderControlProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  disabled?: boolean
  suffixValue?: string // affiché à côté de la valeur courante (ex: "s" pour secondes)
  /**
   * Si fourni, le slider est bridé à cette valeur max (< max absolu).
   * Affiche un indicateur visuel + tooltip explicatif.
   */
  clampedMax?: number
  /** Appelé quand l'utilisateur interagit après un bridage → permet au parent de reset le clamp. */
  onClampReset?: () => void
}
