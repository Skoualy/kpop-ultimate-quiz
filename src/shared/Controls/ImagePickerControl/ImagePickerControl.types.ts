import type { ImageCreditInput, ImageTransformReport } from '@/shared/models/AssetCredit'

export interface ImagePickerControlProps {
  value: string
  placeholderImage?: string
  onChange: (dataUrl: string) => void
  onFileChange?: (file: File | null) => void
  /**
   * Appelé après chaque crop confirmé avec le rapport de transformation
   * (dimensions, crop, conversion webp).
   */
  onTransformReport?: (report: ImageTransformReport) => void
  /**
   * Appelé après chaque crop confirmé avec les infos de crédit déclarées
   * dans le modal (sourceType, originalFileName) + le rapport de transformation
   * fusionné dedans.
   */
  onCreditChange?: (credit: ImageCreditInput) => void
  label?: string
  hint?: string
  aspectRatio?: string
  disabled?: boolean
  outputWidth?: number
  outputHeight?: number
}
