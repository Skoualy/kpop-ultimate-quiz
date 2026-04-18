import type { ImageCreditInput, ImageTransformReport } from '@/shared/models/AssetCredit'

export interface ImagePickerControlProps {
  value: string
  placeholderImage?: string
  onChange: (dataUrl: string) => void
  onFileChange?: (file: File | null) => void
  onTransformReport?: (report: ImageTransformReport) => void
  onCreditChange?: (credit: ImageCreditInput) => void
  /**
   * Crédit courant — pré-remplit le modal en mode édition (bouton ✎).
   * Si non fourni, le modal s'ouvre avec une valeur vide.
   */
  currentCredit?: ImageCreditInput | null
  label?: string
  hint?: string
  aspectRatio?: string
  disabled?: boolean
  outputWidth?: number
  outputHeight?: number
}
